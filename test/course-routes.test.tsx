import { LanguageProvider } from "@stats-viz/shared/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { apps } from "../scripts/apps";
import { LearnRouter } from "../src/course/components/LearnRouter";
import {
  getActivityRoute,
  getChapterRoute,
  getLegacyTeachingRoute,
  getTopicRoute,
  parseLearnRoute,
} from "../src/course/routeHelpers";

describe("course route helpers", () => {
  it("builds canonical chapter, topic, and activity paths centrally", () => {
    expect(getChapterRoute("probability-distributions")).toBe("/learn/distributions");
    expect(getTopicRoute("normal-distribution")).toBe("/learn/distributions/normal-distribution");
    expect(getActivityRoute("normal-distribution-comparison")).toBe(
      "/learn/distributions/normal-distribution/comparison",
    );
    expect(getActivityRoute("confidence-interval-coverage")).toBe(
      "/learn/inference/confidence-interval/coverage",
    );
    expect(getActivityRoute("draw-regression-line")).toBe(
      "/learn/regression/linear-regression/draw-a-line",
    );
  });

  it("parses each level of the learning hierarchy and rejects bad references", () => {
    expect(parseLearnRoute("/learn")).toEqual({ kind: "not-found" });
    expect(parseLearnRoute("/learn/inference")).toMatchObject({
      kind: "chapter",
      chapterIds: ["parameter-estimation", "hypothesis-testing"],
    });
    expect(parseLearnRoute("/learn/inference/confidence-interval")).toMatchObject({
      kind: "topic",
      topicId: "confidence-interval",
    });
    expect(parseLearnRoute("/learn/inference/confidence-interval/coverage")).toMatchObject({
      kind: "activity",
      activityId: "confidence-interval-coverage",
    });
    expect(parseLearnRoute("/learn/distributions/not-a-topic")).toEqual({
      kind: "not-found",
    });
  });

  it("maps every legacy teaching hash to its registered activity", () => {
    for (const app of apps) {
      expect(getLegacyTeachingRoute(`#${app.id}`)).toBe(getActivityRoute(app.activityId));
    }
    expect(getLegacyTeachingRoute("#unknown")).toBe(
      "/learn/inference/confidence-interval/coverage",
    );
  });
});

describe("learning course pages", () => {
  it("does not expose the retired chapter landing page", () => {
    render(
      <LanguageProvider>
        <LearnRouter pathname="/learn" />
      </LanguageProvider>,
    );
    expect(
      screen.queryByRole("heading", { name: "从一个问题，走到可信的统计结论" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /返回统计教学平台/ })).toHaveAttribute(
      "href",
      "/teaching-platform",
    );
  });

  it("renders a topic page with prerequisite, activity, coding, and practice links", () => {
    render(
      <LanguageProvider>
        <LearnRouter pathname="/learn/inference/confidence-interval" />
      </LanguageProvider>,
    );
    expect(screen.getByRole("heading", { name: "置信区间", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "学习目标" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /置信区间覆盖实验/ })).toHaveAttribute(
      "href",
      "/learn/inference/confidence-interval/coverage",
    );
    expect(screen.getByRole("link", { name: /练习这一知识点/ })).toHaveAttribute(
      "href",
      "/st-qselector?topicId=confidence-interval",
    );
  });
});
