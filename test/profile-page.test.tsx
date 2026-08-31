import { LanguageProvider, setLanguage } from "@stats-viz/shared/i18n";
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetPortalSessionCache } from "../src/auth/session";
import { ProfilePage } from "../src/profile/ProfilePage";

function mockSignedInUser() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify({ user: { username: "student01", role: "student" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

describe("personal learning page", () => {
  beforeEach(() => {
    localStorage.clear();
    setLanguage("zh");
    resetPortalSessionCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires sign-in before showing the personal record", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: "请先登录" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    );

    render(
      <LanguageProvider>
        <ProfilePage />
      </LanguageProvider>,
    );

    expect(await screen.findByRole("heading", { name: "登录后查看学习档案" })).toBeInTheDocument();
    const loginLink = screen.getByRole("link", { name: "前往登录" });
    expect(loginLink.getAttribute("href")).toBe("/st-qselector/login?next=%2Fprofile");
    expect(screen.queryByRole("heading", { name: "我的学习档案" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "登录后可以访问的内容" })).toBeInTheDocument();
    fetchMock.mockRestore();
  });

  it("connects all five learning spaces without inventing saved progress", async () => {
    mockSignedInUser();
    render(
      <LanguageProvider>
        <ProfilePage />
      </LanguageProvider>,
    );

    await waitFor(() => expect(screen.getByText("student01")).toBeInTheDocument());

    expect(screen.getByRole("heading", { name: "我的学习档案" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /从教材开始/ })).toHaveAttribute("href", "/catalog");

    const expectedLinks = [
      ["教材", "/catalog"],
      ["模拟实验", "/teaching-platform"],
      ["组卷", "/st-qselector"],
      ["R", "/r-learning?returnTo=%2Fprofile"],
      ["Python", "/python-learning?returnTo=%2Fprofile"],
    ] as const;
    const spaces = screen
      .getByRole("heading", {
        name: "五个板块，同一条学习路径",
      })
      .closest("section");
    expect(spaces).not.toBeNull();

    for (const [name, href] of expectedLinks) {
      expect(
        within(spaces as HTMLElement).getByRole("link", {
          name: new RegExp(`^${name}`),
        }),
      ).toHaveAttribute("href", href);
    }
    expect(screen.getAllByText("尚未保存进度")).toHaveLength(1);
  });

  it("shows real saved code progress and resumes the last safe route", async () => {
    const fetchMock = mockSignedInUser();
    localStorage.setItem(
      "statmind-learning-progress-v1",
      JSON.stringify({
        version: 1,
        completedTopics: ["descriptive-statistics"],
        completedActivities: ["sampling-lab"],
        completedRLessons: ["vectors-and-mean", "data-frame-filter"],
        completedPythonLessons: ["lists-and-mean"],
        lastVisitedRoute: "/r-learning?lessonId=data-frame-filter",
      }),
    );

    render(
      <LanguageProvider>
        <ProfilePage />
      </LanguageProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /继续 R 编程练习/ })).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /继续 R 编程练习/ })).toHaveAttribute(
      "href",
      "/r-learning?lessonId=data-frame-filter",
    );
    expect(screen.getByText("2 / 39 已完成")).toBeInTheDocument();
    expect(screen.getByText("1 / 43 已完成")).toBeInTheDocument();
    expect(screen.getByText("student01")).toBeInTheDocument();
    expect(screen.getByText("学生账号")).toBeInTheDocument();
    fetchMock.mockRestore();
  });
});
