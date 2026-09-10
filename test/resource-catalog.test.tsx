import { LanguageProvider, setLanguage } from "@stats-viz/shared/i18n";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TextbookResourceCatalog } from "../src/course/components/TextbookResourceCatalog";
import { textbookResourceCatalog } from "../src/course/resourceCatalog";
import { pythonLessons } from "../src/python-learning/lessons";
import { rLessons } from "../src/r-learning/lessons";

describe("textbook resource catalog", () => {
  beforeEach(() => {
    setLanguage("zh");
    window.history.replaceState(null, "", "/catalog");
  });

  it("keeps all twelve chapters on one page and aggregates every coding lesson once", () => {
    expect(textbookResourceCatalog).toHaveLength(12);
    expect(textbookResourceCatalog.flatMap(({ rLessons: lessons }) => lessons)).toHaveLength(
      rLessons.length,
    );
    expect(textbookResourceCatalog.flatMap(({ pythonLessons: lessons }) => lessons)).toHaveLength(
      pythonLessons.length,
    );
  });

  it("opens with a full-page chapter index, then enters the chapter learning hub", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <TextbookResourceCatalog />
      </LanguageProvider>,
    );

    const chapterIndex = await screen.findByLabelText("完整教材章节目录");
    expect(within(chapterIndex).getAllByRole("button")).toHaveLength(12);
    expect(document.getElementById("main-content")).toHaveClass("ed-catalog-overview");
    expect(screen.queryByLabelText("全部教材章节")).not.toBeInTheDocument();

    await user.click(within(chapterIndex).getByRole("button", { name: /06\s*样本的统计推断/ }));

    const layout = document.getElementById("main-content");
    expect(layout).toHaveClass("chapter-hub");
    expect(screen.queryByLabelText("全部教材章节")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "样本的统计推断", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本章知识地图" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "用代码复现" })).toBeInTheDocument();
    expect(screen.getByLabelText("可拖动、可缩放的本章知识关系图")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "放大" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "缩小" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "开始本章练习" })).toHaveAttribute(
      "href",
      "/st-qselector?textbookChapterId=mes-ch06",
    );
  });
});
