import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatedFetch } from "../src/authenticatedFetch";

describe("authenticatedFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = "stat_csrf=; Max-Age=0; Path=/";
  });

  it("adds the CSRF cookie to state-changing same-origin requests", async () => {
    document.cookie = "stat_csrf=test-token; Path=/";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));

    await authenticatedFetch("/api/example", { method: "POST" });

    const init = fetchMock.mock.calls[0][1];
    expect(new Headers(init?.headers).get("X-CSRF-Token")).toBe("test-token");
    expect(init?.credentials).toBe("same-origin");
  });

  it("does not attach a CSRF header to safe methods", async () => {
    document.cookie = "stat_csrf=test-token; Path=/";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));

    await authenticatedFetch("/api/example");

    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has("X-CSRF-Token")).toBe(false);
  });
});
