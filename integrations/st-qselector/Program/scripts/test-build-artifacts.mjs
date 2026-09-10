import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, ".open-next/assets");
assert.ok(fs.existsSync(assets), "Cloudflare build assets directory does not exist");
const files = fs.readdirSync(assets, { recursive: true, encoding: "utf8" })
  .map((entry) => entry.replaceAll(path.sep, "/"));
const leaked = files.filter((entry) =>
  entry.endsWith("/data/reviewed-questions.json")
  || /\/assets\/Ch(?:0[1-9]|1[0-3])\//.test(entry)
  || /(?:Data-Chapter|dataset_10K)/.test(entry),
);
assert.deepEqual(leaked, [], `private release content leaked into build assets: ${leaked.join(", ")}`);

const generatedSource = fs.readFileSync(path.join(root, "src/generated/reviewed-questions.ts"), "utf8");
const serializedIndex = generatedSource.match(/reviewedQuestionIndex:\s*QuestionsResponse\s*=\s*([\s\S]+);\s*$/)?.[1];
assert.ok(serializedIndex, "Generated reviewed-question index could not be parsed");
const reviewedIndex = JSON.parse(serializedIndex);
const firstQuestion = reviewedIndex.questions?.[0];
assert.ok(firstQuestion?.content && firstQuestion?.answer, "Generated index has no question canary");
const canaries = [
  reviewedIndex.revision,
  firstQuestion.content.slice(0, 120),
  firstQuestion.answer.slice(0, 120),
].flatMap((value) => [value, JSON.stringify(value).slice(1, -1)]);
const textAssets = files.filter((entry) => /\.(?:html?|js|json|map|rsc|txt)$/i.test(entry));
const chunkLeaks = [];
for (const entry of textAssets) {
  const file = path.join(assets, entry);
  if (!fs.statSync(file).isFile()) continue;
  const content = fs.readFileSync(file, "utf8");
  if (canaries.some((canary) => canary.length >= 32 && content.includes(canary))) chunkLeaks.push(entry);
}
assert.deepEqual(chunkLeaks, [], `reviewed question content leaked into public chunks: ${chunkLeaks.join(", ")}`);
console.log("Cloudflare build contains no public question-bank index, private attachments, or reviewed-content canaries.");
