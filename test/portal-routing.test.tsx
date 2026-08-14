import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@stats-viz/shared/i18n";
import { PortalHome } from "../src/PortalHome";

describe("portal destination routing", () => {
  it("opens the 13-module teaching platform instead of the chapter course path", () => {
    render(
      <LanguageProvider>
        <PortalHome />
      </LanguageProvider>,
    );

    expect(screen.getByRole("link", { name: /R 语言知识库/ })).toHaveAttribute(
      "href",
      "/r-learning?returnTo=%2F",
    );
    expect(screen.getByRole("link", { name: /Python 语言知识库/ })).toHaveAttribute(
      "href",
      "/python-learning?returnTo=%2F",
    );

    expect(screen.getByRole("link", { name: /统计教学平台/ })).toHaveAttribute(
      "href",
      "/teaching-platform",
    );
  });
});
