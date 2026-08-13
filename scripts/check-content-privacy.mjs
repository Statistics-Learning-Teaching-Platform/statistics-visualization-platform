import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const officePattern = /\.(?:pdf|pptx?|docx?)$/i;
const legacyDocumentRoot = "integrations/st-qselector/Data/";
const legacyDocumentBaseline = {
  count: 86,
  pathListSha256: "3e77af2ea6fcb7e5839b1444e818d3d54b81ea7f3ef7e5b4001ac06e1492c72b",
};
const deployRoots = ["public", "dist", "integrations/st-qselector/Program/public"];
const textExtensions = new Set([".html", ".js", ".mjs", ".cjs", ".json", ".css", ".txt", ".xml", ".svg", ".map"]);
const findings = [];

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
}

function walk(relativeDir) {
  const absolute = path.join(root, relativeDir);
  if (!fs.existsSync(absolute)) return [];
  const result = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.posix.join(relativeDir.replaceAll(path.sep, "/"), entry.name);
    if (entry.isDirectory()) result.push(...walk(relative));
    else result.push(relative);
  }
  return result;
}

function inspectText(relative) {
  if (!textExtensions.has(path.extname(relative).toLowerCase())) return;
  const value = fs.readFileSync(path.join(root, relative), "utf8");
  const checks = [
    [/\/(?:Users|home)\/[A-Za-z0-9._-]+\//, "local absolute path"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
    [/(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}/, "API key-like value"],
    [/integrations\/st-qselector\/Data\/(?:Origin|Formed)/i, "offline source path"],
    [/(?:Assignment|Solution)[^"'\n]{0,100}\.(?:docx?|pdf|pptx?)/i, "original document name"],
  ];
  for (const [pattern, label] of checks) {
    if (pattern.test(value)) findings.push(`${relative}: ${label}`);
  }
}

const tracked = trackedFiles();
const trackedOfficeFiles = tracked.filter((relative) => officePattern.test(relative)).sort();
const trackedOfficeHash = createHash("sha256").update(`${trackedOfficeFiles.join("\n")}\n`).digest("hex");
if (trackedOfficeFiles.length !== legacyDocumentBaseline.count || trackedOfficeHash !== legacyDocumentBaseline.pathListSha256) {
  findings.push(`tracked office-document baseline changed (${trackedOfficeFiles.length} files); review explicitly before updating the gate`);
}
for (const relative of tracked) {
  if (officePattern.test(relative) && !relative.startsWith(legacyDocumentRoot)) {
    findings.push(`${relative}: tracked office document outside the preserved legacy baseline`);
  }
  if (relative.startsWith(".next/") || relative.startsWith("dist/")) {
    findings.push(`${relative}: generated build output must not be tracked`);
  }
}

for (const deployRoot of deployRoots) {
  for (const relative of walk(deployRoot)) {
    if (officePattern.test(relative)) findings.push(`${relative}: office document in deployment output`);
    inspectText(relative);
  }
}

// Active source files are scanned for high-confidence secrets and local paths.
for (const relative of tracked) {
  if (!/^(?:src|apps|scripts|integrations\/st-qselector\/Program\/src)\//.test(relative)) continue;
  if (relative.includes("/generated/") || relative === "scripts/check-content-privacy.mjs") continue;
  inspectText(relative);
}

if (findings.length) {
  console.error("Content privacy gate failed:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

const preservedLegacyCount = trackedOfficeFiles.length;
console.log(`Privacy gate passed. ${preservedLegacyCount} pre-existing offline documents remain isolated under ${legacyDocumentRoot}`);
