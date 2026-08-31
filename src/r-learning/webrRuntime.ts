import type { WebR } from "webr";

export type RExecutionResult = {
  console: string[];
  image: ImageBitmap | null;
  environment: string[];
};

let webRPromise: Promise<WebR> | null = null;
let activeWebR: WebR | null = null;
let lastExecutionHadPlot = false;
let runtimeGeneration = 0;

// Must match `webRDirectory` in scripts/sync-browser-runtimes.mjs. The -cf2
// suffix versions the URL space so edge-cached copies from before the
// CSP-rewriting Pages Function never shadow fresh responses.
const WEBR_RUNTIME_PATH = "/runtime/webr/0.6.0-cf3/";
const MAX_SOURCE_LENGTH = 50_000;
const MAX_OUTPUT_LENGTH = 64 * 1024;
const INITIALIZATION_TIMEOUT_MS = 150_000;
const EXECUTION_TIMEOUT_MS = 20_000;
const CONTROL_TIMEOUT_MS = 10_000;

function formatOutput(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object" && "message" in data) {
    return String((data as { message: unknown }).message);
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function closeInstance(instance: WebR): void {
  try {
    instance.interrupt();
  } catch {
    // The channel may already be closed.
  }
  try {
    instance.close();
  } catch {
    // Closing an already failed runtime is best-effort.
  }
  if (activeWebR === instance) {
    activeWebR = null;
    webRPromise = null;
    runtimeGeneration += 1;
  }
  lastExecutionHadPlot = false;
}

function withTimeout<T>(
  operation: Promise<T>,
  instance: WebR,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      closeInstance(instance);
      reject(new Error(message));
    }, timeoutMs);

    operation.then(
      (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function limitConsole(output: Array<{ data: unknown }>): string[] {
  const lines: string[] = [];
  let remaining = MAX_OUTPUT_LENGTH;
  for (const entry of output) {
    if (remaining <= 0) break;
    const formatted = formatOutput(entry.data);
    if (!formatted) continue;
    lines.push(formatted.slice(0, remaining));
    remaining -= formatted.length;
  }
  if (remaining <= 0) lines.push("[输出已截断：单次最多显示 64 KiB]");
  return lines;
}

export async function getWebR(): Promise<WebR> {
  if (!webRPromise) {
    const generation = ++runtimeGeneration;
    const pending = import("webr")
      .then(async ({ WebR }) => {
        const instance = new WebR({
          interactive: false,
          baseUrl: new URL(WEBR_RUNTIME_PATH, window.location.origin).href,
        });
        try {
          await withTimeout(
            Promise.resolve(instance.init()),
            instance,
            INITIALIZATION_TIMEOUT_MS,
            "R 环境加载超时，请检查网络后重试",
          );
        } catch (error) {
          closeInstance(instance);
          throw error;
        }
        if (generation !== runtimeGeneration) {
          closeInstance(instance);
          throw new Error("R 环境已关闭");
        }
        activeWebR = instance;
        return instance;
      })
      .catch((error: unknown) => {
        if (webRPromise === pending) {
          webRPromise = null;
          runtimeGeneration += 1;
        }
        throw error;
      });
    webRPromise = pending;
  }
  return webRPromise;
}

export async function runRCode(code: string): Promise<RExecutionResult> {
  if (code.length > MAX_SOURCE_LENGTH) throw new Error("R 代码不能超过 50,000 个字符");
  const webR = await getWebR();
  lastExecutionHadPlot = false;
  let captured: Awaited<ReturnType<typeof webR.globalShelter.captureR>> | null = null;
  let selectedImage: ImageBitmap | null = null;
  let imageHandedOff = false;
  try {
    captured = await withTimeout(
      webR.globalShelter.captureR(code, {
        withAutoprint: true,
        captureStreams: true,
        captureConditions: true,
        captureGraphics: {
          width: 760,
          height: 460,
          pointsize: 12,
          bg: "#fffdf8",
          capture: true,
        },
      }),
      webR,
      EXECUTION_TIMEOUT_MS,
      "R 运行超过时间限制，环境已安全重置",
    );
    selectedImage = captured.images.at(-1) ?? null;
    lastExecutionHadPlot = selectedImage !== null;
    const environment = await withTimeout(
      webR.evalRRaw(
        "base::head(base::sort(base::ls(envir = base::globalenv())), 100L)",
        "string[]",
      ),
      webR,
      CONTROL_TIMEOUT_MS,
      "读取 R 环境超时，环境已安全重置",
    );

    const result = {
      console: limitConsole(captured.output),
      image: selectedImage,
      environment,
    };
    imageHandedOff = true;
    return result;
  } finally {
    if (captured) {
      for (const image of captured.images) {
        if (!imageHandedOff || image !== selectedImage) image.close();
      }
      try {
        await webR.globalShelter.destroy(captured.result);
      } catch {
        // A timeout may have closed the shelter before cleanup completes.
      }
    }
  }
}

export async function checkRCode(checkCode: string): Promise<boolean> {
  if (checkCode.length > 10_000) throw new Error("检查表达式过长");
  const webR = await getWebR();
  return withTimeout(
    webR.evalRBoolean(`base::isTRUE(base::tryCatch(base::local({
      user <- base::globalenv()
      .statmind_had_plot <- ${lastExecutionHadPlot ? "TRUE" : "FALSE"}
      ${checkCode}
    }, envir = base::new.env(parent = base::baseenv())), error = function(...) FALSE))`),
    webR,
    CONTROL_TIMEOUT_MS,
    "R 答案检查超时，环境已安全重置",
  );
}

export async function resetRSession(): Promise<void> {
  disposeWebRRuntime();
}

export function disposeWebRRuntime(): void {
  runtimeGeneration += 1;
  const pending = webRPromise;
  webRPromise = null;
  const instance = activeWebR;
  activeWebR = null;
  lastExecutionHadPlot = false;
  if (instance) {
    closeInstance(instance);
    return;
  }
  void pending?.then((loaded) => closeInstance(loaded)).catch(() => undefined);
}
