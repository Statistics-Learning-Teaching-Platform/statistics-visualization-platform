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

test("read-only model discovery is not blocked by a missing GET Origin header", () => {
  const source = fs.readFileSync(path.join(root, "src/app/api/ai/models/route.ts"), "utf8");
  assert.doesNotMatch(source, /assertSafeOrigin\(request\)/);
  assert.match(source, /requireRequestSession\(request\)/);
});

test("model availability comes only from the live upstream loaded state", () => {
  const client = fs.readFileSync(path.join(root, "src/lib/ai-client.ts"), "utf8");
  const catalogue = fs.readFileSync(path.join(root, "src/lib/stat-ai-models.ts"), "utf8");
  const wrangler = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
  assert.match(catalogue, /Array\.isArray\(candidate\.loaded_instances\)/);
  assert.match(catalogue, /candidate\.loaded_instances\.length > 0/);
  assert.doesNotMatch(`${client}\n${catalogue}`, /DEFAULT_AI_MODEL|process\.env\.STAT_AI_MODEL|LEGACY_MODEL|\^lfm/i);
  assert.doesNotMatch(wrangler, /STAT_AI_MODEL/);
});

test("generation rechecks loaded models and never calls a model-management endpoint", () => {
  const client = fs.readFileSync(path.join(root, "src/lib/ai-client.ts"), "utf8");
  const catalogue = fs.readFileSync(path.join(root, "src/lib/stat-ai-models.ts"), "utf8");
  assert.match(client, /findLoadedStatAiModel\(models, requested\)/);
  assert.match(catalogue, /models\.find\(\(model\) => model\.key === key && model\.loaded\)/);
  assert.doesNotMatch(client, /models\.find\(\(model\) => model\.loaded\)/);
  assert.match(client, /所选模型当前未启用或已被移除/);
  assert.match(client, /请先手动扫描并选择一个已启用模型/);
  assert.match(client, /所选模型标识无效/);
  assert.doesNotMatch(`${client}\n${catalogue}`, /\/api\/v1\/(?:load|models\/load)/);
});

test("upstream model discovery is byte-bounded and runtime-validated", () => {
  const client = fs.readFileSync(path.join(root, "src/lib/ai-client.ts"), "utf8");
  const catalogue = fs.readFileSync(path.join(root, "src/lib/stat-ai-models.ts"), "utf8");
  assert.match(client, /readLimitedJsonResponse<unknown>\(response\)/);
  assert.match(client, /MAX_AI_RESPONSE_BYTES\s*=\s*2 \* 1024 \* 1024/);
  assert.match(catalogue, /!isRecord\(payload\) \|\| !Array\.isArray\(payload\.models\)/);
  assert.match(catalogue, /MAX_STAT_AI_MODEL_RECORDS/);
});

test("model choices are populated only by an explicit scan and are not persisted", () => {
  const paper = fs.readFileSync(path.join(root, "src/components/AiPaperWorkspace.tsx"), "utf8");
  const tutor = fs.readFileSync(path.resolve(root, "../../..", "src/code-learning/EditorialLearningWorkspace.tsx"), "utf8");
  const tutorAnswer = fs.readFileSync(path.resolve(root, "../../..", "src/code-learning/TutorAnswer.tsx"), "utf8");
  for (const source of [paper, tutor]) {
    assert.doesNotMatch(source, /MODEL_STORAGE_KEY|localStorage/);
    assert.match(source, /scan(?:Ai|Tutor)Models/);
    assert.match(source, /未启用/);
  }
  assert.doesNotMatch(tutor, /ed-live-suggestions|为什么这里使用 mean|What does <- mean/);
  assert.match(tutorAnswer, /window\.setInterval/);
  assert.match(tutor, /useTutorAutoScroll\(tutorMessagesRef\)/);
  assert.match(tutor, /onScroll=\{updateTutorScrollFollowState\}/);
  assert.match(tutorAnswer, /distanceFromBottom/);
  assert.match(tutorAnswer, /followsLatestRef\.current/);
});

test("upstream AI authentication is sourced from a Worker secret", () => {
  const client = fs.readFileSync(path.join(root, "src/lib/ai-client.ts"), "utf8");
  assert.match(client, /process\.env\.STAT_AI_API_TOKEN/);
  assert.match(client, /Authorization:\s*`Bearer \$\{token\}`/);
  assert.doesNotMatch(client, /sk-lm-/);
});

test("upstream AI generation is bounded, non-persistent and reasoning is capability-gated", () => {
  const client = fs.readFileSync(path.join(root, "src/lib/ai-client.ts"), "utf8");
  assert.match(client, /const maxOutputTokens = normalizeMaxOutputTokens\(options\.maxOutputTokens\)/);
  assert.match(client, /max_output_tokens:\s*maxOutputTokens/);
  assert.match(client, /statAiContextUsage\(options\.systemPrompt, options\.input, maxOutputTokens\)/);
  assert.match(client, /reasoning:\s*selectStatAiReasoning\(model, includeReasoning\)/);
  assert.match(client, /requestStatAi\(options, false\)/);
  assert.match(client, /requestStatAi\(options, true\)/);
  assert.match(client, /store:\s*false/);
  assert.match(client, /DEFAULT_MAX_OUTPUT_TOKENS\s*=\s*4_096/);
});

test("tutor prompts describe the same constrained Mermaid contract as the client renderer", () => {
  const tutor = fs.readFileSync(path.join(root, "src/lib/tutor-route.ts"), "utf8");
  const experiment = fs.readFileSync(path.join(root, "src/app/api/ai/experiment-tutor/route.ts"), "utf8");
  for (const source of [tutor, experiment]) {
    assert.match(source, /SAFE_MERMAID_GUIDANCE/);
    assert.match(source, /at most one Mermaid fenced block/);
    assert.match(source, /xychart-beta/);
    assert.match(source, /every series must have a unique non-empty quoted name/);
    assert.match(source, /pie showData/);
    assert.match(source, /Never emit directives, comments, HTML, links/);
    assert.match(source, /scatterplots, histograms, dotplots, stem-and-leaf displays, boxplots/);
  }
  const renderer = fs.readFileSync(path.resolve(root, "../../..", "src/code-learning/mermaid.ts"), "utf8");
  const component = fs.readFileSync(path.resolve(root, "../../..", "src/code-learning/MermaidDiagram.tsx"), "utf8");
  assert.match(renderer, /MAX_SOURCE_LENGTH\s*=\s*4_000/);
  assert.match(renderer, /MAX_TUTOR_DIAGRAMS\s*=\s*1/);
  assert.match(component, /securityLevel:\s*["']strict["']/);
  assert.match(component, /DOMPurify|dompurify/);
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
