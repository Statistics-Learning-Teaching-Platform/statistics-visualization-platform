import { describe, expect, it } from "vitest";
import { localizeText } from "../apps/shared/i18n";

describe("exact i18n localization", () => {
  it("does not partially translate longer English sentences", () => {
    expect(localizeText("A confidence interval is useful.", "zh")).toBe(
      "A confidence interval is useful.",
    );
  });

  it("translates complete known strings", () => {
    expect(localizeText("Concept + key idea", "zh")).toBe("概念 + 核心思想");
    expect(localizeText("概念 + 核心思想", "en")).toBe("Concept + key idea");
  });

  it("translates teaching control hints used by interactive panels", () => {
    expect(
      localizeText("Sets the false-positive rate and controls the rejection region.", "zh"),
    ).toBe("设定假阳性率，并控制拒绝域的位置。");
    expect(localizeText("Defines the center of the null distribution.", "zh")).toBe(
      "定义原假设分布的中心。",
    );
    expect(localizeText("Moves the true distribution and changes the effect size.", "zh")).toBe(
      "移动真实分布，并改变效应大小。",
    );
    expect(localizeText("Wider distributions increase overlap and usually raise beta.", "zh")).toBe(
      "分布越宽，重叠越多，通常会提高 β。",
    );
  });

  it("translates bootstrap result labels without leaving English UI words", () => {
    expect(localizeText("Bootstrap mean summary", "zh")).toBe("自助法均值摘要");
    expect(localizeText("Bootstrap means", "zh")).toBe("自助法均值");
  });
});
