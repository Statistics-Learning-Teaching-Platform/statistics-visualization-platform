/**
 * Client-side reader for the tutor SSE envelope.
 *
 * Tutor routes deliberately expose a tiny, application-owned protocol rather
 * than forwarding the upstream provider's wire format.  Keeping the parser
 * here means the R, Python, and experiment tutors all get identical handling
 * for split UTF-8 chunks, CRLF records, and bounded output.
 */

export type TutorStreamEvent =
  | { type: "reasoning.delta"; delta: string }
  | { type: "message.delta"; delta: string }
  | { type: "done"; model?: string }
  | { type: "error"; message: string; status?: number };

const MAX_STREAM_BYTES = 2 * 1024 * 1024;
const MAX_EVENT_BYTES = 256 * 1024;
const streamEncoder = new TextEncoder();

export class TutorStreamError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TutorStreamError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseEvent(eventName: string, data: string): TutorStreamEvent | null {
  if (!data.trim()) return null;
  if (data.trim() === "[DONE]") return { type: "done" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new TutorStreamError("AI returned an invalid stream event");
  }
  if (!isRecord(parsed)) throw new TutorStreamError("AI returned an invalid stream event");

  // The route names the event in the SSE `event:` field.  Accepting `type` as
  // a fallback makes the reader tolerant of proxies that preserve data but
  // accidentally strip the event field, while still validating the value.
  const type = eventName || (typeof parsed.type === "string" ? parsed.type : "");
  if (type === "reasoning.delta" || type === "message.delta") {
    if (typeof parsed.delta !== "string" || !parsed.delta) {
      throw new TutorStreamError("AI returned an invalid stream delta");
    }
    return { type, delta: parsed.delta };
  }
  if (type === "done") {
    return {
      type: "done",
      ...(typeof parsed.model === "string" && parsed.model ? { model: parsed.model } : {}),
    };
  }
  if (type === "error") {
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (!message) throw new TutorStreamError("AI returned an invalid stream error");
    const status =
      typeof parsed.status === "number" && Number.isInteger(parsed.status)
        ? parsed.status
        : undefined;
    return { type: "error", message, ...(status === undefined ? {} : { status }) };
  }
  throw new TutorStreamError("AI returned an unknown stream event");
}

/**
 * Read one SSE response and invoke `onEvent` in wire order.
 *
 * This intentionally does not use `EventSource`: tutor requests are POSTs,
 * need the authenticated response credentials/CSRF headers, and must inherit
 * the caller's AbortSignal.  A completed stream must contain a `done` event;
 * truncation is surfaced as an error rather than silently presenting a partial
 * answer as complete.
 */
export async function consumeTutorStream(
  response: Response,
  onEvent: (event: TutorStreamEvent) => void,
): Promise<void> {
  if (!response.ok) {
    let message = `AI service returned ${response.status}`;
    try {
      const payload = (await response.json()) as unknown;
      if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error.trim();
      }
    } catch {
      // Preserve the status-derived message when an error response is not JSON.
    }
    throw new TutorStreamError(message, response.status);
  }
  if (!response.body) throw new TutorStreamError("AI returned an empty stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let totalBytes = 0;
  let sawDone = false;

  const flushRecord = (record: string) => {
    if (streamEncoder.encode(record).byteLength > MAX_EVENT_BYTES) {
      throw new TutorStreamError("AI stream event is too large");
    }
    // SSE allows CRLF, CR, or LF line endings.  A record may contain multiple
    // data lines; concatenate them with a newline as required by the spec.
    const fields = record.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    let eventName = "";
    const dataLines: string[] = [];
    for (const line of fields) {
      if (!line || line.startsWith(":")) continue;
      const separator = line.indexOf(":");
      const field = separator < 0 ? line : line.slice(0, separator);
      const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
      if (field === "event") eventName = value;
      else if (field === "data") dataLines.push(value);
    }
    const event = parseEvent(eventName, dataLines.join("\n"));
    if (!event) return;
    onEvent(event);
    if (event.type === "done") sawDone = true;
    if (event.type === "error") {
      throw new TutorStreamError(event.message, event.status);
    }
  };

  try {
    while (!sawDone) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_STREAM_BYTES) {
        throw new TutorStreamError("AI response is too large");
      }
      pending += decoder.decode(value, { stream: true });
      // Keep at most one incomplete record in memory.  The bounded check also
      // protects against an upstream that never emits a blank-line separator.
      if (pending.length > MAX_EVENT_BYTES && !/\r\n\r\n|\n\n|\r\r/.test(pending)) {
        throw new TutorStreamError("AI stream event is too large");
      }
      let boundary: RegExpExecArray | null;
      const boundaryPattern = /\r\n\r\n|\n\n|\r\r/;
      while ((boundary = boundaryPattern.exec(pending))) {
        const record = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        flushRecord(record);
        if (sawDone) break;
      }
    }
    if (!sawDone) {
      pending += decoder.decode();
      if (pending.trim()) flushRecord(pending);
    }
    if (!sawDone) throw new TutorStreamError("AI stream ended before completion");
  } finally {
    // `done` is the application terminator. Cancel any unread transport bytes
    // and release the lock on every parse/error/abort path so neither fetch
    // connections nor the server-side concurrency lease linger.
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
