import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { apps } from "../scripts/apps";
import { appRegistry } from "../src/shell/appRegistry";

describe("platform integration inventory", () => {
  it("auto-discovers a lazy entry for every app in the single source of truth", () => {
    // appRegistry is built at module load from import.meta.glob over every
    // app's main.tsx. Behaviorally assert each record in apps.ts yields an
    // entry here (rather than grepping source text for the discovery code).
    for (const app of apps) {
      expect(appRegistry[app.id]).toBeDefined();
    }
    expect(Object.keys(appRegistry).length).toBeGreaterThanOrEqual(apps.length);
  });

  it("carries a sidebar icon and a group on every app record", () => {
    for (const app of apps) {
      expect(typeof app.icon).toBe("string");
      expect(app.icon.length).toBeGreaterThan(0);
      expect(app.group.length).toBeGreaterThan(0);
    }
  });

  it("centralizes dependencies in the root package.json (no per-app package.json)", () => {
    // Apps are source directories, not workspace packages. The root package.json
    // owns all dependencies and scripts. Only apps/shared remains a workspace.
    const rootPackageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    ) as { dependencies?: Record<string, string>; workspaces?: string[] };

    expect(rootPackageJson.workspaces).toEqual(["apps/shared"]);
    expect(rootPackageJson.dependencies).toHaveProperty("d3");
    expect(rootPackageJson.dependencies).toHaveProperty("jstat");
    expect(rootPackageJson.dependencies).toHaveProperty("bootstrap");

    for (const app of apps) {
      expect(existsSync(resolve(process.cwd(), app.path, "package.json"))).toBe(false);
    }
  });

  it("builds via a single vite build of the shell (no per-app builds)", () => {
    const rootPackageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    ) as { scripts?: Record<string, string> };
    expect(rootPackageJson.scripts?.build).toBe("node scripts/build.mjs");

    const buildSource = readFileSync(resolve(process.cwd(), "scripts/build.mjs"), "utf8");
    expect(buildSource).toContain("execFileSync");
    expect(buildSource).toContain('"vite"');
  });

  it("uses app-relative script entries so standalone app dev loads app code", () => {
    for (const app of apps) {
      const indexHtml = readFileSync(resolve(process.cwd(), app.path, "index.html"), "utf8");
      // All apps are React: their standalone index.html points at main.tsx.
      expect(indexHtml).toContain('src="./src/main.tsx"');
      expect(indexHtml).not.toContain('src="/src/main.tsx"');
    }
  });

  it("does not rely on app-local import aliases in app source files", () => {
    const sourceFiles = listSourceFiles(resolve(process.cwd(), "apps"));
    for (const filePath of sourceFiles) {
      const source = readFileSync(filePath, "utf8");
      expect(source).not.toMatch(/from ["']@(components|utils)\//);
    }
  });
});

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = resolve(dir, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return /\.(ts|tsx)$/.test(entryPath) ? [entryPath] : [];
  });
}
