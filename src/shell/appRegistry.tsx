import { lazy, type ComponentType } from "react";
import { apps } from "../../scripts/apps";

type AppComponent = ComponentType;

// Auto-discover every app's React entry point via Vite's glob import.
// Adding a new app only requires appending ONE record to scripts/apps.ts —
// no need to touch this file.
const tsxModules = import.meta.glob("../../apps/*/src/main.tsx");

function lazyReactApp(path: string): AppComponent {
  return lazy(async () => {
    const mod = await tsxModules[path]();
    return { default: (mod as { default: ComponentType }).default };
  });
}

// Build the registry from the single source of truth (scripts/apps.ts).
export const appRegistry: Record<string, AppComponent> = {};
for (const app of apps) {
  const tsxPath = `../../apps/${app.id}/src/main.tsx`;
  if (tsxModules[tsxPath]) {
    appRegistry[app.id] = lazyReactApp(tsxPath);
  } else {
    console.warn(`[appRegistry] No main.tsx found for app "${app.id}"`);
  }
}
