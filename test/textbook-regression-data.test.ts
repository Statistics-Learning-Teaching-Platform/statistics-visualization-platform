import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface RegressionDataset {
  id: string;
  name: string;
  source?: string;
  xLabel?: string;
  yLabel?: string;
  data: Array<{ x: number; y: number }>;
}

const dataDir = resolve(
  process.cwd(),
  "apps/regression/public/data/textbook"
);

describe("textbook regression datasets", () => {
  it("publishes chapter 8 textbook datasets as regression-ready JSON files", () => {
    const files = readdirSync(dataDir).filter((file) => file.endsWith(".json"));

    expect(files.length).toBeGreaterThanOrEqual(10);

    const fatherHeight = JSON.parse(
      readFileSync(resolve(dataDir, "chapter-8-height-father-height.json"), "utf8")
    ) as RegressionDataset;

    expect(fatherHeight).toMatchObject({
      id: "chapter-8-height-father-height",
      source: "表8-9 影响大学男生身高的因素",
      xLabel: "父亲身高（厘米）",
      yLabel: "身高（厘米）"
    });
    expect(fatherHeight.data.length).toBeGreaterThan(20);
    expect(fatherHeight.data[0]).toEqual({ x: 175, y: 173 });
  });

  it("loads textbook datasets from the regression app bootstrap", () => {
    const mainSource = readFileSync(
      resolve(process.cwd(), "apps/regression/src/constants.ts"),
      "utf8"
    );

    expect(mainSource).toContain(
      "data/textbook/chapter-8-height-father-height.json"
    );
    expect(mainSource).toContain(
      "data/textbook/chapter-8-book-spending-income.json"
    );
  });
});
