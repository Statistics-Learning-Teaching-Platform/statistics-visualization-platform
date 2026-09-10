import { type ComponentType, lazy } from "react";
import { apps } from "../../scripts/apps";

type AppComponent = ComponentType;

// Auto-discover every app's React entry point via Vite's glob import.
// Adding a new app only requires appending ONE record to scripts/apps.ts —
// no need to touch this file.
const tsxModules = import.meta.glob("../../apps/*/src/main.tsx");

const modulePathByAppId: Record<string, string> = {};

export async function loadVisualizerComponent(appId: string): Promise<AppComponent> {
  const path = modulePathByAppId[appId];
  const loadModule = path ? tsxModules[path] : undefined;
  if (!loadModule) {
    throw new Error(`Visualizer entry is unavailable: ${appId}`);
  }
  const mod = await loadModule();
  const component = (mod as { default?: ComponentType }).default;
  if (!component) {
    throw new Error(`Visualizer entry has no default component: ${appId}`);
  }
  return component;
}

function lazyReactApp(appId: string): AppComponent {
  return lazy(async () => {
    const component = await loadVisualizerComponent(appId);
    return { default: component };
  });
}

// Build the registry from the single source of truth (scripts/apps.ts).
export const appRegistry: Record<string, AppComponent> = {};
for (const app of apps) {
  // Vite and Vitest can expose different relative prefixes for the same glob.
  // Match the stable app suffix so dev, test, and production all register the
  // exact same visualizer entry.
  const suffix = `/apps/${app.id}/src/main.tsx`;
  const tsxPath = Object.keys(tsxModules).find((path) => path.endsWith(suffix));
  if (tsxPath) {
    modulePathByAppId[app.id] = tsxPath;
    appRegistry[app.id] = lazyReactApp(app.id);
  } else {
    console.warn(`[appRegistry] No main.tsx found for app "${app.id}"`);
  }
}
