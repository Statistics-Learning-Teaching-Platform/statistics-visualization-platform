import type { WebR } from "webr";

export type RExecutionResult = {
  console: string[];
  image: ImageBitmap | null;
  environment: string[];
};

let webRPromise: Promise<WebR> | null = null;

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

export async function getWebR(): Promise<WebR> {
  if (!webRPromise) {
    webRPromise = import("webr")
      .then(async ({ WebR }) => {
        const instance = new WebR({ interactive: false });
        await instance.init();
        return instance;
      })
      .catch((error: unknown) => {
        webRPromise = null;
        throw error;
      });
  }
  return webRPromise;
}

export async function runRCode(code: string): Promise<RExecutionResult> {
  const webR = await getWebR();
  const captured = await webR.globalShelter.captureR(code, {
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
  });

  const environment = await webR.evalRRaw(
    "sort(ls(envir = .GlobalEnv))",
    "string[]",
  );

  return {
    console: captured.output.map((entry) => formatOutput(entry.data)).filter(Boolean),
    image: captured.images.at(-1) ?? null,
    environment,
  };
}

export async function checkRCode(checkCode: string): Promise<boolean> {
  const webR = await getWebR();
  return webR.evalRBoolean(`isTRUE({${checkCode}})`);
}

export async function resetRSession(): Promise<void> {
  const webR = await getWebR();
  await webR.evalRVoid("rm(list = ls(envir = .GlobalEnv), envir = .GlobalEnv)");
}
