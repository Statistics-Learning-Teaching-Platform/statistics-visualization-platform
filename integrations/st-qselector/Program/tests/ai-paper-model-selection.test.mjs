import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isSelectableAiModel,
  selectLoadedAiModel,
} from "../src/lib/ai-model-selection.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = fs.readFileSync(
  path.join(root, "src/components/AiPaperWorkspace.tsx"),
  "utf8",
);

const models = [
  { key: "loaded@q8", displayName: "Loaded", quantization: "Q8", params: "8B", loaded: true },
  { key: "offline@q4", displayName: "Offline", quantization: "Q4", params: "7B", loaded: false },
];

test("only a loaded model returned by the current scan can be selected", () => {
  assert.equal(isSelectableAiModel(models[0]), true);
  assert.equal(isSelectableAiModel(models[1]), false);
  assert.equal(selectLoadedAiModel(models, "loaded@q8"), "loaded@q8");
  assert.equal(selectLoadedAiModel(models, "offline@q4"), "");
  assert.equal(selectLoadedAiModel(models, "missing@q8"), "");
  assert.equal(selectLoadedAiModel([], "loaded@q8"), "");
});

test("workspace restores the shared browser snapshot and scans only on explicit user action", () => {
  assert.match(workspace, /loadAiModelCache|localStorage/);
  assert.doesNotMatch(workspace, /useEffect\([\s\S]{0,400}scanAiModels\s*\(/);

  const scanStart = workspace.indexOf("async function scanAiModels");
  const request = workspace.indexOf('authenticatedFetch("/api/ai/models"', scanStart);
  assert.ok(scanStart >= 0 && request > scanStart);
  assert.match(workspace, /saveAiModelCache\(result\.models/);
  assert.match(workspace, /onClick=\{refreshAiModels\}/);
  assert.match(workspace, /请选择模型/);
});

test("each AI operation requires and sends the explicitly selected loaded model", () => {
  assert.match(workspace, /if \(!selectedAiModel\)[\s\S]*?选择已启用模型/);
  assert.match(workspace, /form\.set\("model", selectedAiModel\)/);
  assert.match(workspace, /JSON\.stringify\(\{ blueprint, variantPercent, model: selectedAiModel \}\)/);
  assert.doesNotMatch(workspace, /model:\s*aiModel\s*\|\||自动使用当前已启用模型|默认模型/);
});

test("unloaded models are uniformly disabled and requests are race-safe", () => {
  assert.match(workspace, /disabled=\{!isSelectableAiModel\(model\)\}/);
  assert.match(workspace, /未加载模型统一显示为“未启用”/);
  assert.doesNotMatch(workspace, /旧模型|老模型|legacy|已停用/i);
  assert.match(workspace, /aiModelsAbortRef\.current !== controller/);
  assert.match(workspace, /knowledgeAbortRef\.current !== controller/);
  assert.match(workspace, /paperAbortRef\.current !== controller/);
  assert.match(workspace, /function changeAiModel[\s\S]*?cancelModelDependentRequests\(\)/);
  assert.match(workspace, /signal: controller\.signal/g);
  assert.match(workspace, /useEffect\(\(\) => \(\) => \{[\s\S]*?\.abort\(\)/);
  assert.equal(
    [...workspace.matchAll(/response\.status === 409\) invalidateAiModelScan\(\)/g)].length,
    2,
  );
  for (const operation of ["async function analyzeMaterial", "async function generateCandidate"]) {
    const start = workspace.indexOf(operation);
    const requestRef = operation.includes("analyze") ? "knowledgeAbortRef" : "paperAbortRef";
    const identityGuard = workspace.indexOf(
      `if (${requestRef}.current !== controller || controller.signal.aborted) return;`,
      start,
    );
    const staleReset = workspace.indexOf("response.status === 409", start);
    assert.ok(start >= 0 && identityGuard > start && staleReset > identityGuard, operation);
  }
  assert.match(workspace, /function invalidateMaterialInput\(\) \{[\s\S]*?cancelModelDependentRequests\(\)/);
  assert.match(workspace, /function invalidateConceptInput\(\) \{[\s\S]*?cancelModelDependentRequests\(\)/);
  assert.match(workspace, /function invalidateBlueprintInput\(\) \{[\s\S]*?paperAbortRef\.current\?\.abort\(\)/);
  assert.match(workspace, /onChange=\{\(event\) => \{ invalidateMaterialInput\(\); setSourceText/);
  assert.match(workspace, /onChange=\{\(event\) => \{ invalidateBlueprintInput\(\); setTargetCount/);
});

test("invalidated candidates cannot finish a stale or duplicate adoption", () => {
  assert.match(workspace, /const candidateEpochRef = useRef\(0\)/);
  assert.match(workspace, /const candidateRef = useRef<HybridCandidate \| null>\(null\)/);
  assert.match(workspace, /const applyBusyRef = useRef\(false\)/);
  assert.match(
    workspace,
    /function replaceCandidate\([\s\S]*?candidateEpochRef\.current \+= 1;[\s\S]*?applyAbortRef\.current\?\.abort\(\);[\s\S]*?setCandidate\(next\)/,
  );
  assert.match(workspace, /function replaceCandidate\([\s\S]*?candidateRef\.current = next/);
  for (const invalidation of [
    "function invalidateMaterialInput",
    "function invalidateConceptInput",
    "function invalidateBlueprintInput",
  ]) {
    const start = workspace.indexOf(invalidation);
    const nextFunction = workspace.indexOf("\n  function ", start + invalidation.length);
    const body = workspace.slice(start, nextFunction < 0 ? undefined : nextFunction);
    assert.ok(start >= 0, invalidation);
    assert.match(body, /replaceCandidate\(null\)/, invalidation);
  }
  assert.match(workspace, /const requestedCandidate = candidateRef\.current;[\s\S]*?if \(!requestedCandidate \|\| applyBusyRef\.current\) return/);
  assert.match(
    workspace,
    /const isCurrentApplication = \(\) =>[\s\S]*?applyAbortRef\.current === controller[\s\S]*?candidateEpochRef\.current === candidateEpoch[\s\S]*?!controller\.signal\.aborted/,
  );
  const callbackGuard = workspace.indexOf("if (!isCurrentApplication()) return;\n      if (mode");
  const replaceCallback = workspace.indexOf('onReplace(ids, transient)', callbackGuard);
  const addCallback = workspace.indexOf('onAdd(ids, transient)', callbackGuard);
  assert.ok(callbackGuard >= 0 && replaceCallback > callbackGuard && addCallback > callbackGuard);
  assert.match(workspace, /checked=\{acceptedCandidateIds\.has\(question\.id\)\}[\s\S]*?disabled=\{applying\}/);
  assert.equal(
    [...workspace.matchAll(/disabled=\{applying\} onClick=\{\(\) => void applyCandidate\(/g)].length,
    2,
  );
});

test("candidate-changing controls are locked while server adoption is pending", () => {
  const requiredLocks = [
    /<textarea disabled=\{applying\} value=\{sourceText\}/,
    /<select id="qb-ai-model"[\s\S]*?disabled=\{applying \|\| aiModelsStatus === "loading"\}/,
    /onClick=\{refreshAiModels\} disabled=\{applying \|\| aiModelsStatus === "loading"\}/,
    /<input ref=\{fileRef\} hidden disabled=\{applying\}/,
    /<button type="button" disabled=\{applying\} onClick=\{\(\) => fileRef\.current\?\.click\(\)\}/,
    /className="qb-ai-text-button" disabled=\{applying\}/,
    /className="qb-ai-primary"[\s\S]*?disabled=\{applying \|\| analyzing/,
    /<button type="button" disabled=\{applying\} onClick=\{\(\) => \{ invalidateConceptInput\(\)/,
    /<input disabled=\{applying\} type="range" min="0\.5"/,
    /<input disabled=\{applying\} value=\{manualConcept\}/,
    /<button type="button" disabled=\{applying\} onClick=\{addManualConcept\}/,
    /<input disabled=\{applying\} type="number" min="1" max="60"/,
    /<input disabled=\{applying\} type="range" min="1" max="5"/,
    /<input disabled=\{applying\} type="number" min="10" max="300"/,
    /<input disabled=\{applying\} type="range" min="0" max="70"/,
    /<button key=\{type\} type="button" disabled=\{applying\}/,
    /className="qb-ai-generate"[\s\S]*?disabled=\{applying \|\| generating/,
  ];
  for (const lock of requiredLocks) assert.match(workspace, lock);
});
