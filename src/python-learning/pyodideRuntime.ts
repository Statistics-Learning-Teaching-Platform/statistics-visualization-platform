import { loadPyodide, version as pyodideVersion, type PyodideInterface } from "pyodide";

export type PythonExecutionResult = {
  console: string[];
  plotUrl: string | null;
  environment: Array<{ name: string; type: string; preview: string }>;
};

const BASE_PACKAGES = ["numpy", "pandas", "matplotlib", "scipy"];
let pyodidePromise: Promise<PyodideInterface> | null = null;

const PRELUDE = `
import io
import sys
import traceback
import base64
from contextlib import redirect_stdout, redirect_stderr

def __statmind_preview(value):
    try:
        text = repr(value)
    except Exception:
        text = "<unavailable>"
    return text if len(text) <= 160 else text[:157] + "..."
`;

export async function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
      packageBaseUrl: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
    })
      .then(async (instance) => {
        await instance.loadPackage(BASE_PACKAGES);
        await instance.runPythonAsync(`${PRELUDE}
import matplotlib
matplotlib.use("Agg")
`);
        return instance;
      })
      .catch((error: unknown) => {
        pyodidePromise = null;
        throw error;
      });
  }
  return pyodidePromise;
}

export async function runPythonCode(code: string): Promise<PythonExecutionResult> {
  const pyodide = await getPyodide();
  pyodide.globals.set("__statmind_user_code", code);
  const payloadProxy = await pyodide.runPythonAsync(`
import json
import matplotlib.pyplot as plt

__statmind_stdout = io.StringIO()
__statmind_stderr = io.StringIO()
__statmind_error = ""
plt.close("all")

try:
    with redirect_stdout(__statmind_stdout), redirect_stderr(__statmind_stderr):
        exec(compile(__statmind_user_code, "<statmind>", "exec"), globals(), globals())
except Exception:
    __statmind_error = traceback.format_exc()

__statmind_plot = None
if plt.get_fignums():
    __statmind_buffer = io.BytesIO()
    plt.gcf().savefig(__statmind_buffer, format="png", dpi=130, bbox_inches="tight", facecolor="#fffdf8")
    __statmind_plot = "data:image/png;base64," + base64.b64encode(__statmind_buffer.getvalue()).decode("ascii")

__statmind_hidden = {name for name in globals() if name.startswith("__statmind_")}
__statmind_skip_types = {"module", "function", "type", "builtin_function_or_method"}
__statmind_environment = [
    {
        "name": name,
        "type": type(value).__name__,
        "preview": __statmind_preview(value),
    }
    for name, value in sorted(globals().items())
    if not name.startswith("_")
    and name not in __statmind_hidden
    and type(value).__name__ not in __statmind_skip_types
][:50]

json.dumps({
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

  const console = [payload.stdout.trim(), payload.stderr.trim(), payload.error.trim()].filter(Boolean);
  if (payload.error) throw new Error(payload.error.trim());
  return {
    console: console.length ? console : ["Code completed without printed output."],
    plotUrl: payload.plot,
    environment: payload.environment,
  };
}

export async function checkPythonCode(checkCode: string): Promise<boolean> {
  const pyodide = await getPyodide();
  pyodide.globals.set("__statmind_check_code", checkCode);
  return Boolean(await pyodide.runPythonAsync(`bool(eval(__statmind_check_code, globals(), globals()))`));
}

export async function resetPythonSession(): Promise<void> {
  const pyodide = await getPyodide();
  await pyodide.runPythonAsync(`
for __statmind_name in list(globals()):
    if not __statmind_name.startswith("__") and __statmind_name not in {"io", "sys", "traceback", "base64", "redirect_stdout", "redirect_stderr", "matplotlib"}:
        globals().pop(__statmind_name, None)
`);
}
