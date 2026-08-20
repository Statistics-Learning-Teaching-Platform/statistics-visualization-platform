import { lazy, Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "../src/shell/AppErrorBoundary";

function BrokenView(): never {
  throw new Error("test render failure");
}

function unhandledRejection(reason: unknown): PromiseRejectionEvent {
  const event = new Event("unhandledrejection", { cancelable: true });
  Object.defineProperty(event, "reason", { value: reason });
  return event as PromiseRejectionEvent;
}

describe("AppErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a recovery action and invokes retry after a render failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onRetry = vi.fn();

    render(
      <AppErrorBoundary onRetry={onRetry}>
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("页面加载失败");
    await userEvent.click(screen.getByRole("button", { name: /重新加载/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the recovery UI for an unhandled asynchronous rejection", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <div>working view</div>
      </AppErrorBoundary>,
    );

    act(() => {
      window.dispatchEvent(unhandledRejection(new Error("async failure")));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("页面加载失败");
  });

  it("shows the recovery UI for a window error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <div>working view</div>
      </AppErrorBoundary>,
    );

    act(() => {
      window.dispatchEvent(new ErrorEvent("error", {
        error: new Error("window failure"),
        message: "window failure",
        cancelable: true,
      }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("页面加载失败");
  });

  it("ignores expected abort rejections", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <div>working view</div>
      </AppErrorBoundary>,
    );

    act(() => {
      window.dispatchEvent(unhandledRejection(new DOMException("stopped", "AbortError")));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("working view")).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("removes both global listeners with their original callbacks", () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <AppErrorBoundary>
        <div>working view</div>
      </AppErrorBoundary>,
    );
    const errorHandler = addListener.mock.calls.find(([type]) => type === "error")?.[1];
    const rejectionHandler = addListener.mock.calls.find(([type]) => type === "unhandledrejection")?.[1];

    unmount();

    expect(errorHandler).toBeDefined();
    expect(rejectionHandler).toBeDefined();
    expect(removeListener).toHaveBeenCalledWith("error", errorHandler);
    expect(removeListener).toHaveBeenCalledWith("unhandledrejection", rejectionHandler);
  });

  it("captures a rejected lazy import through the render boundary", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const LazyFailure = lazy(() => Promise.reject(new Error("chunk failed")));

    render(
      <AppErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <LazyFailure />
        </Suspense>
      </AppErrorBoundary>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("页面加载失败");
  });
});
