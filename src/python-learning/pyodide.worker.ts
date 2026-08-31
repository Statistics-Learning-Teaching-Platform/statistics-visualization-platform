/// <reference lib="webworker" />

import { loadPyodide, type PyodideInterface, version as pyodideVersion } from "pyodide";
import type { PythonExecutionResult } from "./pyodideRuntime";

type WorkerRequest =
  | { id: number; kind: "init" }
  | { id: number; kind: "run"; value: string }
  | { id: number; kind: "check"; value: string };

const MAX_SOURCE_LENGTH = 50_000;
const RUNTIME_BASE = new URL(`/runtime/pyodide/${pyodideVersion}/`, self.location.origin).href;
let pyodidePromise: Promise<PyodideInterface> | null = null;
let lastExecutionHadPlot = false;

const PRELUDE = `
import io
import sys
import traceback
import base64
import builtins
import json
from contextlib import redirect_stdout, redirect_stderr

__statmind_compile = compile
__statmind_exec = exec
__statmind_eval = eval
__statmind_bool = bool
__statmind_format_exc = traceback.format_exc
__statmind_import = builtins.__import__
__statmind_type = type
__statmind_isinstance = isinstance
__statmind_abs = abs
__statmind_all = all
__statmind_callable = callable
__statmind_float = float
__statmind_getattr = getattr
__statmind_int = int
__statmind_len = len
__statmind_list = list
__statmind_dict = dict
__statmind_repr = repr
__statmind_sorted = sorted
__statmind_str = str
__statmind_builtins_snapshot = builtins.__dict__.copy()
__statmind_restore_builtins = dict.update
__statmind_json_dumps = json.dumps
__statmind_bytes_io = io.BytesIO
__statmind_b64encode = base64.b64encode
__StatMindBaseException = BaseException
__StatMindException = Exception
__StatMindImportError = ImportError
__StatMindModuleNotFoundError = ModuleNotFoundError

def __statmind_new_user_globals():
    return {
        "__name__": "__main__",
        "__builtins__": builtins.__dict__.copy(),
    }

__statmind_user_globals = __statmind_new_user_globals()

class __StatMindLimitedWriter:
    def __init__(self, limit=65536):
        self.limit = limit
        self.parts = []
        self.length = 0
        self.truncated = False

    def write(self, value):
        text = __statmind_str(value)
        remaining = self.limit - self.length
        if remaining > 0:
            piece = text[:remaining]
            self.parts.append(piece)
            self.length += len(piece)
        if len(text) > remaining:
            self.truncated = True
        return len(text)

    def flush(self):
        return None

    def getvalue(self):
        suffix = "\\n[输出已截断：单次最多显示 64 KiB]" if self.truncated else ""
        return "".join(self.parts) + suffix

def __statmind_preview(value):
    try:
        text = __statmind_repr(value)
    except __StatMindException:
        text = "<unavailable>"
    return text if len(text) <= 160 else text[:157] + "..."
`;

async function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({ indexURL: RUNTIME_BASE, packageBaseUrl: RUNTIME_BASE })
      .then(async (instance) => {
        await instance.runPythonAsync(PRELUDE);
        return instance;
      })
      .catch((error: unknown) => {
        pyodidePromise = null;
        throw error;
      });
  }
  return pyodidePromise;
}

async function runCode(code: string): Promise<PythonExecutionResult> {
  if (code.length > MAX_SOURCE_LENGTH) throw new Error("Python 代码不能超过 50,000 个字符");
  const pyodide = await getPyodide();
  await pyodide.loadPackagesFromImports(code);
  if (/(?:^|\n)\s*(?:from\s+matplotlib\b|import\s+[^\n]*\bmatplotlib\b)/m.test(code)) {
    await pyodide.runPythonAsync('__statmind_import("matplotlib").use("Agg")');
  }
  pyodide.globals.set("__statmind_user_code", code);
  lastExecutionHadPlot = false;
  const payloadProxy = await pyodide.runPythonAsync(`
__statmind_stdout = __StatMindLimitedWriter()
__statmind_stderr = __StatMindLimitedWriter()
__statmind_error = ""
__statmind_plt = None
try:
    __statmind_plt = __statmind_import("matplotlib.pyplot")
    __statmind_plt.close("all")
except (__StatMindImportError, __StatMindModuleNotFoundError):
    pass

try:
    with redirect_stdout(__statmind_stdout), redirect_stderr(__statmind_stderr):
        __statmind_exec(
            __statmind_compile(__statmind_user_code, "<statmind>", "exec"),
            __statmind_user_globals,
            __statmind_user_globals,
        )
except __StatMindBaseException:
    __statmind_error = __statmind_format_exc()[-12000:]
finally:
    __statmind_restore_builtins(builtins.__dict__, __statmind_builtins_snapshot)

__statmind_plot = None
if __statmind_plt is not None and __statmind_plt.get_fignums():
    __statmind_buffer = __statmind_bytes_io()
    __statmind_plt.gcf().savefig(__statmind_buffer, format="png", dpi=110, bbox_inches="tight", facecolor="#fffdf8")
    if __statmind_buffer.tell() <= 2 * 1024 * 1024:
        __statmind_plot = "data:image/png;base64," + __statmind_b64encode(__statmind_buffer.getvalue()).decode("ascii")
    else:
        __statmind_stderr.write("\\n[图像超过 2 MiB，已停止传输]")

__statmind_skip_types = {"module", "function", "type", "builtin_function_or_method"}
__statmind_environment = [
    {"name": name, "type": __statmind_type(value).__name__, "preview": __statmind_preview(value)}
    for name, value in __statmind_sorted(__statmind_user_globals.items())
    if not name.startswith("_")
    and __statmind_type(value).__name__ not in __statmind_skip_types
][:50]

__statmind_json_dumps({
    "stdout": __statmind_stdout.getvalue(),
    "stderr": __statmind_stderr.getvalue(),
    "error": __statmind_error,
    "plot": __statmind_plot,
    "environment": __statmind_environment,
})
`);
  let payload: {
    stdout: string;
    stderr: string;
    error: string;
    plot: string | null;
    environment: Array<{ name: string; type: string; preview: string }>;
  };
  try {
    payload = JSON.parse(String(payloadProxy)) as typeof payload;
  } finally {
    payloadProxy.destroy?.();
  }

  const console = [payload.stdout.trim(), payload.stderr.trim(), payload.error.trim()].filter(
    Boolean,
  );
  if (payload.error) throw new Error(payload.error.trim());
  lastExecutionHadPlot = payload.plot !== null;
  return {
    console: console.length ? console : ["Code completed without printed output."],
    plotUrl: payload.plot,
    environment: payload.environment,
  };
}

async function handle(request: WorkerRequest): Promise<unknown> {
  if (request.kind === "init") {
    await getPyodide();
    return true;
  }
  const pyodide = await getPyodide();
  if (request.kind === "run") return runCode(request.value);
  if (request.value.length > 10_000) throw new Error("检查表达式过长");
  pyodide.globals.set("__statmind_check_code", request.value);
  pyodide.globals.set("__statmind_had_plot", lastExecutionHadPlot);
  return Boolean(
    await pyodide.runPythonAsync(`
try:
    __statmind_check_builtins = {
        "abs": __statmind_abs,
        "all": __statmind_all,
        "bool": __statmind_bool,
        "callable": __statmind_callable,
        "dict": __statmind_dict,
        "float": __statmind_float,
        "getattr": __statmind_getattr,
        "int": __statmind_int,
        "isinstance": __statmind_isinstance,
        "len": __statmind_len,
        "list": __statmind_list,
        "type": __statmind_type,
    }
    __statmind_check_globals = {
        "__builtins__": __statmind_check_builtins,
        "user": __statmind_user_globals,
        "metadata": {"had_plot": __statmind_had_plot},
    }
    __statmind_check_result = __statmind_bool(
        __statmind_eval(__statmind_check_code, __statmind_check_globals, {})
    )
except __StatMindBaseException:
    __statmind_check_result = False
__statmind_check_result
`),
  );
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  void handle(request)
    .then((result) => self.postMessage({ id: request.id, ok: true, result }))
    .catch((error: unknown) =>
      self.postMessage({
        id: request.id,
        ok: false,
        error:
          error instanceof Error ? error.message.slice(0, 12_000) : String(error).slice(0, 12_000),
      }),
    );
});

export {};
