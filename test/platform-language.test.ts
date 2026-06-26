import { describe, expect, it } from "vitest";
import { getPlatformCopy } from "@stats-viz/shared/i18n";

describe("platform language copy", () => {
  it("uses Chinese labels for all platform groups in zh mode", () => {
    const zhCopy = getPlatformCopy("zh");
    expect(zhCopy.groups["Core Visualizers"]).toBe("核心可视化");
    expect(zhCopy.groups["WALS Simulation"]).toBe("模拟模块");
    expect(zhCopy.groups["WALS MES"]).toBe("方法模块");
  });
});
