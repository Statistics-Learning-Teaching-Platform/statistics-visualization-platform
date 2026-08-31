import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { sessionAccessError } from "../src/lib/auth/access-policy.ts";
import { resolveClientAddress } from "../src/lib/auth/client-address.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("initial-password sessions are denied before role checks", () => {
  assert.deepEqual(
    sessionAccessError({ role: "superadmin", mustChangePassword: true }, ["superadmin"]),
    { status: 403, message: "首次登录必须先修改初始密码" },
  );
});

test("roles are enforced after password rotation", () => {
  assert.equal(sessionAccessError({ role: "teacher", mustChangePassword: false }, ["teacher", "superadmin"]), null);
  assert.equal(sessionAccessError({ role: "student", mustChangePassword: false }, ["teacher", "superadmin"])?.status, 403);
});

test("anonymous client addresses require an explicitly trusted ingress", () => {
  const headers = new Headers({
    "cf-connecting-ip": "203.0.113.7",
    "x-forwarded-for": "198.51.100.9, 10.0.0.2",
  });
  assert.equal(resolveClientAddress(headers, undefined), "unknown");
  assert.equal(resolveClientAddress(headers, "invalid"), "unknown");
  assert.equal(resolveClientAddress(headers, "cloudflare"), "203.0.113.7");
  assert.equal(resolveClientAddress(headers, "x-forwarded-for"), "198.51.100.9");
});

test("Cloudflare ingress never falls back to X-Forwarded-For", () => {
  const headers = new Headers({ "x-forwarded-for": "198.51.100.9" });
  assert.equal(resolveClientAddress(headers, "cloudflare"), "unknown");
  const wrangler = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
  assert.match(wrangler, /"STAT_TRUSTED_PROXY":\s*"cloudflare"/);
});

test("knowledge upload parsing and AI calls use separate global leases", () => {
  const source = fs.readFileSync(path.join(root, "src/app/api/ai/knowledge/route.ts"), "utf8");
  const parseLease = source.indexOf('route: "ai-knowledge-parse"');
  const formRead = source.indexOf("readLimitedFormData(request");
  const fileParse = source.indexOf("extractCoursewareText(fileValue)");
  const aiLease = source.lastIndexOf('route: "ai-knowledge"');
  assert.ok(parseLease >= 0 && parseLease < formRead);
  assert.ok(formRead < fileParse && fileParse < aiLease);
});

test("root proxy instructions allow the fixed Vite development origin", () => {
  const source = fs.readFileSync(path.resolve(root, "../../..", "README.md"), "utf8");
  assert.match(source, /STAT_ALLOWED_ORIGINS=http:\/\/127\.0\.0\.1:4174 npm run dev/);
});

test("release generation leaves no complete bank or attachments in public", () => {
  assert.equal(fs.existsSync(path.join(root, "public/data/reviewed-questions.json")), false);
  assert.equal(fs.existsSync(path.join(root, "public/assets")), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "database/private-assets-manifest.json"), "utf8"));
  assert.ok(manifest.assets.length > 0);
  assert.ok(manifest.assets.every((asset) => typeof asset.sha256 === "string" && !Object.hasOwn(asset, "content")));
});

test("review release declares known chapter coverage gaps", async () => {
  const generatedSource = fs.readFileSync(path.join(root, "src/generated/reviewed-questions.ts"), "utf8");
  assert.match(generatedSource, /"emptyChapterIds":\["Ch12"\]/);
  assert.match(generatedSource, /"id":"Ch11"[^}]*"count":2/);
});
