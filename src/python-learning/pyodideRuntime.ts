export type PythonExecutionResult = {
  console: string[];
  plotUrl: string | null;
  environment: Array<{ name: string; type: string; preview: string }>;
};

type RequestKind = "init" | "run" | "check";
type WorkerResponse = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: number;
}

let worker: Worker | null = null;
let requestId = 0;
let initialization: Promise<void> | null = null;
const pending = new Map<number, PendingRequest>();
const MAX_SOURCE_LENGTH = 50_000;

function terminateWorker(reason: Error) {
  worker?.terminate();
  worker = null;
  initialization = null;
  for (const request of pending.values()) {
    window.clearTimeout(request.timer);
    request.reject(reason);
  }
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url), { type: "module", name: "statmind-python" });
  worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    window.clearTimeout(request.timer);
    if (event.data.ok) request.resolve(event.data.result);
    else request.reject(new Error(event.data.error));
  });
  worker.addEventListener("error", (event) => {
    terminateWorker(new Error(event.message || "Python Worker 意外停止"));
  });
  return worker;
}

function requestWorker<T>(kind: RequestKind, value: string | undefined, timeoutMs: number): Promise<T> {
  const activeWorker = getWorker();
  const id = ++requestId;
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      terminateWorker(new Error(kind === "init" ? "Python 环境加载超时，请检查网络后重试" : "Python 运行超过时间限制，环境已安全重置"));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as (result: unknown) => void, reject, timer });
    activeWorker.postMessage(value === undefined ? { id, kind } : { id, kind, value });
  });
}

async function ensureReady(): Promise<void> {
  if (!initialization) {
    initialization = requestWorker<boolean>("init", undefined, 150_000)
      .then(() => undefined)
      .catch((error) => {
        initialization = null;
        throw error;
      });
  }
  return initialization;
}

export async function runPythonCode(code: string): Promise<PythonExecutionResult> {
  if (code.length > MAX_SOURCE_LENGTH) throw new Error("Python 代码不能超过 50,000 个字符");
  await ensureReady();
  return requestWorker<PythonExecutionResult>("run", code, 20_000);
}

export async function checkPythonCode(checkCode: string): Promise<boolean> {
  await ensureReady();
  return requestWorker<boolean>("check", checkCode, 10_000);
}

export async function resetPythonSession(): Promise<void> {
  terminateWorker(new Error("Python 会话已重置"));
}

export function disposePythonRuntime(): void {
  terminateWorker(new Error("Python 环境已关闭"));
}
