import { setLanguage } from "@stats-viz/shared/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortalAuthEntry } from "../src/auth/PortalAuthEntry";
import { authenticatedFetch } from "../src/authenticatedFetch";
import { loadPortalSession, resetPortalSessionCache } from "../src/auth/session";
import { AI_MODEL_CACHE_STORAGE_KEY } from "../src/code-learning/tutorModels";
import { EditorialDemoShell } from "../src/visual-demo/editorial/EditorialPrimitives";

function authenticatedResponse() {
  return new Response(
    JSON.stringify({ user: { username: "template", role: "student" } }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

describe("portal header authentication", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    resetPortalSessionCache();
    setLanguage("zh");
    window.history.replaceState(null, "", "/");
    document.cookie = "stat_csrf=; Max-Age=0; Path=/";
  });

  it("links anonymous visitors back to the complete current URL after sign-in", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 401 }));
    window.history.replaceState(null, "", "/python-learning?lesson=02#editor");

    render(
      <EditorialDemoShell current="python" siteMode="product">
        <main id="main-content" />
      </EditorialDemoShell>,
    );

    expect(await screen.findByRole("link", { name: "登录" })).toHaveAttribute(
      "href",
      "/st-qselector/login?next=%2Fpython-learning%3Flesson%3D02%23editor",
    );
    expect(fetchMock).toHaveBeenCalledWith("/st-qselector/api/auth/me", {
      credentials: "same-origin",
    });
  });

  it("does not check account state inside the visual demo", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(
      <EditorialDemoShell current="home">
        <main id="main-content" />
      </EditorialDemoShell>,
    );
    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "登录" })).not.toBeInTheDocument();
  });

  it("opens the signed-in account menu by hover, click, and keyboard", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(authenticatedResponse());
    const user = userEvent.setup();
    render(<PortalAuthEntry />);

    const trigger = await screen.findByRole("button", { name: "template 的账户菜单" });
    expect(trigger).not.toHaveAttribute("aria-haspopup");
    const profile = screen.getByText("个人中心").closest("a");
    expect(profile).not.toBeNull();
    expect(profile).not.toBeVisible();

    await user.hover(trigger);
    expect(screen.getByRole("group", { name: "template 的账户菜单" })).toBeInTheDocument();
    expect(profile).toBeVisible();
    await user.unhover(trigger);
    expect(profile).not.toBeVisible();

    await user.tab();
    expect(trigger).toHaveFocus();
    expect(profile).not.toBeVisible();
    await user.keyboard("{Enter}");
    expect(profile).toBeVisible();
    await user.tab();
    expect(profile).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(profile).not.toBeVisible();
    expect(trigger).toHaveFocus();
  });

  it("toggles the account menu and closes it after an outside pointer press", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(authenticatedResponse());
    const user = userEvent.setup();
    render(<PortalAuthEntry />);

    const trigger = await screen.findByRole("button", { name: "template 的账户菜单" });
    const profile = screen.getByText("个人中心").closest("a");
    expect(profile).not.toBeNull();

    await user.click(trigger);
    expect(profile).toBeVisible();
    await user.click(trigger);
    expect(profile).not.toBeVisible();
    await user.click(trigger);
    expect(profile).toBeVisible();
    fireEvent.pointerDown(document.body);
    expect(profile).not.toBeVisible();
  });

  it("updates mounted consumers when an authenticated request returns 401", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(authenticatedResponse())
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    render(<PortalAuthEntry />);

    expect(await screen.findByRole("button", { name: "template 的账户菜单" })).toBeInTheDocument();
    await authenticatedFetch("/st-qselector/api/ai/models");

    expect(await screen.findByRole("link", { name: "登录" })).toBeInTheDocument();
  });

  it("updates mounted consumers after another tab broadcasts sign-out", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(authenticatedResponse());
    render(<PortalAuthEntry />);

    expect(await screen.findByRole("button", { name: "template 的账户菜单" })).toBeInTheDocument();
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "statmind.portal-session-invalidated",
        newValue: "another-tab",
      }),
    );

    expect(await screen.findByRole("link", { name: "登录" })).toBeInTheDocument();
  });

  it.each([204, 401])(
    "clears the session cache and returns home after logout status %s",
    async (status) => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(authenticatedResponse())
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(new Response(null, { status: 401 }));
      const navigateHome = vi.fn();
      const user = userEvent.setup();
      const modelCache = JSON.stringify({ marker: "keep-across-logout" });
      localStorage.setItem(AI_MODEL_CACHE_STORAGE_KEY, modelCache);
      document.cookie = "stat_csrf=csrf-value; Path=/";
      render(<PortalAuthEntry navigateHome={navigateHome} />);

      const trigger = await screen.findByRole("button", { name: "template 的账户菜单" });
      await user.hover(trigger);
      await user.click(screen.getByRole("button", { name: "退出登录" }));

      await waitFor(() => expect(navigateHome).toHaveBeenCalledOnce());
      expect(fetchMock.mock.calls[1][0]).toBe("/st-qselector/api/auth/logout");
      const logoutInit = fetchMock.mock.calls[1][1];
      expect(logoutInit?.method).toBe("POST");
      expect(logoutInit?.credentials).toBe("same-origin");
      expect(new Headers(logoutInit?.headers).get("X-CSRF-Token")).toBe("csrf-value");
      expect(localStorage.getItem(AI_MODEL_CACHE_STORAGE_KEY)).toBe(modelCache);

      await loadPortalSession();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    },
  );

  it("keeps the menu available when logout fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(authenticatedResponse())
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const navigateHome = vi.fn();
    const user = userEvent.setup();
    render(<PortalAuthEntry navigateHome={navigateHome} />);

    await user.hover(await screen.findByRole("button", { name: "template 的账户菜单" }));
    await user.click(screen.getByRole("button", { name: "退出登录" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("退出登录失败，请稍后重试。");
    expect(navigateHome).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "退出登录" })).toBeEnabled();
  });
});
