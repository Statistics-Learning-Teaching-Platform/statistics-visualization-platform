import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertExportOutputBudget,
  assertExportSourceBudget,
  createExportBudget,
  ExportBudgetError,
  MAX_EXPORT_IMAGE_BYTES,
  MAX_EXPORT_IMAGES,
  MAX_EXPORT_OUTPUT_BYTES,
  MAX_EXPORT_SOURCE_CHARACTERS,
  MAX_EXPORT_TABLE_CELLS,
  MAX_EXPORT_TOTAL_IMAGE_BYTES,
  reserveExportImage,
  reserveExportTableCells,
} from "../src/lib/export-budget.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("DOCX source, output, image and table budgets reject overflow", () => {
  assert.doesNotThrow(() => assertExportSourceBudget(MAX_EXPORT_SOURCE_CHARACTERS));
  assert.throws(() => assertExportSourceBudget(MAX_EXPORT_SOURCE_CHARACTERS + 1), ExportBudgetError);
  assert.doesNotThrow(() => assertExportOutputBudget(MAX_EXPORT_OUTPUT_BYTES));
  assert.throws(() => assertExportOutputBudget(MAX_EXPORT_OUTPUT_BYTES + 1), ExportBudgetError);

  const imageBudget = createExportBudget();
  assert.throws(() => reserveExportImage(imageBudget, MAX_EXPORT_IMAGE_BYTES + 1), ExportBudgetError);
  const chunk = Math.floor(MAX_EXPORT_TOTAL_IMAGE_BYTES / MAX_EXPORT_IMAGES);
  for (let index = 0; index < MAX_EXPORT_IMAGES; index += 1) reserveExportImage(imageBudget, chunk);
  assert.throws(() => reserveExportImage(imageBudget, 1), ExportBudgetError);

  const tableBudget = createExportBudget();
  reserveExportTableCells(tableBudget, MAX_EXPORT_TABLE_CELLS);
  assert.throws(() => reserveExportTableCells(tableBudget, 1), ExportBudgetError);
});

test("asset route handles access and 304 before loading bytea", () => {
  const route = fs.readFileSync(path.join(root, "src/app/api/asset/route.ts"), "utf8");
  const metadata = route.indexOf("getPrivateAssetMetadata(");
  const access = route.indexOf("asset.accessScope");
  const notModified = route.indexOf('request.headers.get("if-none-match")');
  const content = route.indexOf("getPrivateAssetContent(");
  assert.ok(metadata >= 0 && access > metadata && notModified > access && content > notModified);
  assert.match(route, /route:\s*"asset-get"/);
  assert.match(route, /consumeRateLimit\(/);
});

test("private asset metadata query does not select content and content read is version-bound", () => {
  const source = fs.readFileSync(path.join(root, "src/lib/private-assets.ts"), "utf8");
  const metadataQuery = source.match(/SELECT asset_key,[\s\S]*?LIMIT 1/)?.[0] ?? "";
  assert.doesNotMatch(metadataQuery, /(?:^|,)\s*content(?:\s|,)/m);
  assert.match(source, /content_sha256 = \$2/);
  assert.match(source, /content_length = \$3/);
  assert.match(source, /hexDigest\(content\)/);
});

test("DOCX route uses a cancellable global concurrency lease", () => {
  const route = fs.readFileSync(path.join(root, "src/app/api/export/docx/route.ts"), "utf8");
  assert.match(route, /withConcurrencyLease\(\{/);
  assert.match(route, /route:\s*"export-docx"/);
  assert.match(route, /limit:\s*2/);
  assert.match(route, /requestSignal:\s*request\.signal/);
  assert.match(route, /signal\.throwIfAborted\(\)/);
});
