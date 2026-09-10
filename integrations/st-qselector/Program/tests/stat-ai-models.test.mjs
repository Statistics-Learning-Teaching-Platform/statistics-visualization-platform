import assert from "node:assert/strict";
import test from "node:test";
import {
  findLoadedStatAiModel,
  MAX_STAT_AI_MODEL_RECORDS,
  parseStatAiModelKey,
  parseStatAiModelsPayload,
  selectStatAiReasoning,
} from "../src/lib/stat-ai-models.ts";

test("catalogue includes every valid LLM and derives availability only from loaded_instances", () => {
  const models = parseStatAiModelsPayload({
    models: [
      {
        type: "llm",
        key: "current@q8",
        display_name: "Current",
        params_string: "9B",
        quantization: { name: "Q8" },
        loaded_instances: [{ id: "instance-1" }],
        capabilities: { reasoning: { allowed_options: ["off", "on"] } },
      },
      {
        type: "llm",
        key: "lfm-old@q4",
        display_name: "Historical model",
        loaded_instances: [],
      },
      {
        type: "llm",
        key: "not-really-loaded",
        loaded_instances: "stale metadata must not count",
      },
      { type: "embedding", key: "embedding-model", loaded_instances: [{}] },
    ],
  });

  assert.deepEqual(models.map(({ key, loaded }) => ({ key, loaded })), [
    { key: "current@q8", loaded: true },
    { key: "lfm-old@q4", loaded: false },
    { key: "not-really-loaded", loaded: false },
  ]);
  assert.equal(models[0].supportsReasoning, true);
  assert.equal(models[1].displayName, "Historical model");
});

test("duplicate upstream records cannot hide a loaded instance", () => {
  const models = parseStatAiModelsPayload({
    models: [
      { type: "llm", key: "same-model", loaded_instances: [] },
      {
        type: "llm",
        key: "same-model",
        display_name: "Named model",
        loaded_instances: [{}],
      },
    ],
  });

  assert.equal(models.length, 1);
  assert.equal(models[0].loaded, true);
  assert.equal(models[0].displayName, "Named model");
});

test("invalid catalogue shapes and invalid model keys fail closed", () => {
  assert.throws(
    () => parseStatAiModelsPayload({ models: "not-an-array" }),
    /invalid catalogue/,
  );
  assert.equal(parseStatAiModelKey(" valid-model@q8 "), "valid-model@q8");
  assert.equal(parseStatAiModelKey(""), undefined);
  assert.equal(parseStatAiModelKey("publisher/model@q4_k_m"), "publisher/model@q4_k_m");
  assert.equal(parseStatAiModelKey("本地模型/统计 tutor:v2"), "本地模型/统计 tutor:v2");
  assert.equal(parseStatAiModelKey("model\u0000name"), undefined);
  assert.equal(parseStatAiModelKey("model\nname"), undefined);
  assert.equal(parseStatAiModelKey("x".repeat(513)), undefined);
  assert.equal(parseStatAiModelKey({}), undefined);
  assert.throws(
    () => parseStatAiModelsPayload({
      models: Array.from({ length: MAX_STAT_AI_MODEL_RECORDS + 1 }, () => ({
        type: "llm",
        key: "duplicate",
        loaded_instances: [],
      })),
    }),
    /catalogue is too large/,
  );
});

test("real upstream names survive discovery and exact loaded-model selection", () => {
  const key = "google/gemma-4-26b-a4b@q4_k_m";
  const models = parseStatAiModelsPayload({ models: [
    { type: "llm", key, loaded_instances: [{ id: key }] },
    { type: "llm", key: "本地/统计模型:v2", loaded_instances: [] },
  ] });
  assert.deepEqual(models.map((model) => model.key), [key, "本地/统计模型:v2"]);
  assert.equal(findLoadedStatAiModel(models, key)?.key, key);
  assert.equal(findLoadedStatAiModel(models, "gemma-4-26b-a4b"), undefined);
});

test("reasoning adapts to switches, effort levels, always-on and absent controls", () => {
  const cases = [
    { allowed_options: ["off", "on"], default: "off", tutor: "on", structured: "off" },
    { allowed_options: ["low", "medium", "high"], default: "high", tutor: "high" },
    { allowed_options: ["low", "medium", "high"], tutor: "medium" },
    { allowed_options: ["on"], default: "on", tutor: "on" },
    { allowed_options: ["off"], structured: "off" },
    {},
    { allowed_options: ["unsupported", null], default: "unsupported" },
  ];
  for (const [index, expected] of cases.entries()) {
    const [model] = parseStatAiModelsPayload({ models: [{
      type: "llm", key: `model-${index}`, loaded_instances: [{}],
      capabilities: { reasoning: expected },
    }] });
    assert.equal(selectStatAiReasoning(model, true), expected.tutor);
    assert.equal(selectStatAiReasoning(model, false), expected.structured);
    assert.equal(model.supportsReasoning, expected.tutor !== undefined);
  }
});

test("selection never falls back to a different loaded model", () => {
  const models = parseStatAiModelsPayload({
    models: [
      { type: "llm", key: "loaded-model", loaded_instances: [{}] },
      { type: "llm", key: "unloaded-model", loaded_instances: [] },
    ],
  });

  assert.equal(findLoadedStatAiModel(models, "loaded-model")?.key, "loaded-model");
  assert.equal(findLoadedStatAiModel(models, "unloaded-model"), undefined);
  assert.equal(findLoadedStatAiModel(models, "deleted-model"), undefined);
});
