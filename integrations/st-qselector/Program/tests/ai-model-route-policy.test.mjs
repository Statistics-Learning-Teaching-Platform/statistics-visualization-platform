import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const client = read("src/lib/ai-client.ts");
const paperRoute = read("src/app/api/ai/paper/route.ts");
const knowledgeRoute = read("src/app/api/ai/knowledge/route.ts");
const tutorRoute = read("src/lib/tutor-route.ts");
const experimentTutorRoute = read("src/app/api/ai/experiment-tutor/route.ts");
const modelsRoute = read("src/app/api/ai/models/route.ts");

test("every generation path requires an explicit syntactically valid model", () => {
  assert.match(client, /interface StatAiCallOptions[\s\S]*?model:\s*string;/);
  assert.match(client, /StatAiModelSelectionError\(400, "请先手动扫描并选择一个已启用模型"\)/);
  assert.match(client, /StatAiModelSelectionError\(400, "所选模型标识无效，请重新扫描并选择"\)/);
  assert.match(paperRoute, /const requestedModel = resolveStatAiModel\(body\.model\)/);
  assert.match(knowledgeRoute, /const model = resolveStatAiModel\(form\.get\("model"\)\)/);
  assert.match(tutorRoute, /const model = resolveStatAiModel\(body\.model\)/);
  assert.match(experimentTutorRoute, /const model = resolveStatAiModel\(body\.model\)/);
});

test("the paper route cannot hide a stale model behind bank fallback", () => {
  const selection = paperRoute.indexOf("const requestedModel = resolveStatAiModel(body.model)");
  const noGenerationReturn = paperRoute.indexOf("if (!generatedNeeded)");
  const livePreflight = paperRoute.indexOf("await requireLoadedStatAiModel(", noGenerationReturn);
  const bankOnlyResponse = paperRoute.indexOf("return NextResponse.json({", noGenerationReturn);
  assert.ok(selection >= 0 && selection < noGenerationReturn);
  assert.ok(
    livePreflight > noGenerationReturn && livePreflight < bankOnlyResponse,
    "bank-only paper generation must recheck the selected model before returning",
  );
  assert.match(
    paperRoute,
    /catch \(error\) \{\s*if \(error instanceof StatAiModelSelectionError\) throw error;\s*console\.error\("AI paper stages failed/,
  );
});

test("probability distributions map before the generic probability chapter", () => {
  const distributionRule = paperRoute.indexOf("probability distributions?");
  const genericProbabilityRule = paperRoute.indexOf("conditional probability|bayes|independence|probability");
  assert.ok(distributionRule >= 0 && distributionRule < genericProbabilityRule);
});

test("AI paper generation uses bounded batches and rejects unsafe aggregate demand", () => {
  assert.match(paperRoute, /const AI_GENERATION_BATCH_SIZE = 3/);
  assert.match(paperRoute, /const MAX_AI_GENERATED_QUESTIONS = AI_GENERATION_BATCH_SIZE/);
  assert.match(paperRoute, /generatedNeeded > MAX_AI_GENERATED_QUESTIONS/);
  assert.match(
    paperRoute,
    /for \(let batchStart = 0; batchStart < jobs\.length; batchStart \+= AI_GENERATION_BATCH_SIZE\)/,
  );
  assert.match(paperRoute, /jobs\.slice\(batchStart, batchStart \+ AI_GENERATION_BATCH_SIZE\)/);
  assert.match(paperRoute, /const AI_GENERATION_MAX_OUTPUT_TOKENS = 3_072/);
  assert.match(paperRoute, /const AI_VERIFICATION_MAX_OUTPUT_TOKENS = 3_072/);
  assert.match(paperRoute, /requestedModel,\s*AI_GENERATION_MAX_OUTPUT_TOKENS/);
  assert.match(paperRoute, /requestedModel,\s*AI_VERIFICATION_MAX_OUTPUT_TOKENS/);
});

test("the knowledge route cannot hide an unavailable model behind local extraction", () => {
  assert.match(
    knowledgeRoute,
    /catch \(error\) \{[\s\S]*?if \(error instanceof StatAiModelSelectionError\) throw error;[\s\S]*?AI 暂不可用，已使用本地提取/,
  );
});

test("generation rescans and returns conflict instead of falling back", () => {
  assert.match(client, /const models = await listStatAiModels\(signal\)/);
  assert.match(client, /findLoadedStatAiModel\(models, requested\)/);
  assert.match(client, /StatAiModelSelectionError\(409, "所选模型当前未启用或已被移除，请重新扫描并选择"\)/);
  assert.doesNotMatch(client, /models\.find\(\(model\) => model\.loaded\)/);
  assert.doesNotMatch(client, /configuredStatAiModel|DEFAULT_AI_MODEL|STAT_AI_MODEL/);
});

test("the catalogue response has no server-selected default or cache", () => {
  assert.match(modelsRoute, /consumeRateLimit\(\{ principal, route: "ai-model-scan"/);
  assert.match(modelsRoute, /route: "ai-model-scan-budget"/);
  assert.match(modelsRoute, /withConcurrencyLease\(\{/);
  assert.match(modelsRoute, /ttlSeconds: 20/);
  assert.match(modelsRoute, /work: \(signal\) => listStatAiModels\(signal\)/);
  assert.match(modelsRoute, /\{ models \}/);
  assert.doesNotMatch(modelsRoute, /defaultModel|configuredStatAiModel/);
  assert.match(modelsRoute, /Cache-Control":\s*"no-store"/);
});
