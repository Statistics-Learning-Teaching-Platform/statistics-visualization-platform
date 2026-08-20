import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

const EXPECTED_CANCELLATION_NAMES = new Set([
  "AbortError",
  "CanceledError",
  "CancelledError",
  "CancellationError",
]);

function isExpectedCancellation(reason: unknown): boolean {
  if (typeof reason !== "object" || reason === null) return false;
  const candidate = reason as { name?: unknown; code?: unknown };
  return (
    (typeof candidate.name === "string" && EXPECTED_CANCELLATION_NAMES.has(candidate.name)) ||
    candidate.code === "ERR_CANCELED"
  );
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Application view failed to render", error, info);
  }

  componentDidMount(): void {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount(): void {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  private captureGlobalFailure(reason: unknown, event: Event): void {
    if (isExpectedCancellation(reason)) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    console.error("Unhandled application error", reason);
    this.setState({ hasError: true });
  }

  private handleWindowError = (event: ErrorEvent): void => {
    const reason = event.error ?? new Error(event.message || "Unknown window error");
    this.captureGlobalFailure(reason, event);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    this.captureGlobalFailure(event.reason, event);
  };

  private handleRetry = (): void => {
    if (this.props.onRetry) {
      this.props.onRetry();
      return;
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="app-error" role="alert">
        <strong>{this.props.title ?? "页面加载失败 / Unable to load this view"}</strong>
        <p>
          {this.props.message ??
            "请重新加载后再试。你的学习进度不会因此被清除。 / Reload and try again. Your saved progress will be kept."}
        </p>
        <button type="button" onClick={this.handleRetry}>
          {this.props.retryLabel ?? "重新加载 / Reload"}
        </button>
      </div>
    );
  }
}
