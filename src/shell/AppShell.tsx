import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { Sidebar, LanguageTabs } from "./Sidebar";
import { appRegistry } from "./appRegistry";
import {
  useLanguage,
  getPlatformCopy,
  getVisualizerLabel,
} from "@stats-viz/shared/i18n";
import { getDefaultVisualizer } from "../../scripts/apps";
import { AppErrorBoundary } from "./AppErrorBoundary";

const PLATFORM_SIDEBAR_WIDTH_KEY = "statistics-platform-sidebar-width";

function getHashId(): string {
  return window.location.hash.replace(/^#\/?/, "");
}

function resolveVisualizerId(id: string): string {
  return id in appRegistry ? id : getDefaultVisualizer().id;
}

function setHashId(id: string): void {
  if (getHashId() !== id) {
    window.location.hash = id;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface ResizeHandleProps {
  onResize: (width: number) => void;
  ariaLabel: string;
}

function ResizeHandle({ onResize, ariaLabel }: ResizeHandleProps) {
  const shellRef = useRef<HTMLElement | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      document.body.classList.add("is-resizing-panels");

      const shell = handle.closest<HTMLElement>(".platform-shell");
      if (!shell) return;
      shellRef.current = shell;

      const onPointerMove = (moveEvent: PointerEvent): void => {
        if (!shellRef.current) return;
        const rect = shellRef.current.getBoundingClientRect();
        const maxWidth = Math.min(380, rect.width * 0.38);
        const width = clamp(moveEvent.clientX - rect.left, 230, maxWidth);
        onResize(width);
      };

      const onPointerUp = (): void => {
        document.body.classList.remove("is-resizing-panels");
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
    },
    [onResize],
  );

  return (
    <div
      className="platform-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
    />
  );
}

export function AppShell() {
  const lang = useLanguage();
  const [activeId, setActiveId] = useState<string>(() => {
    const hashId = getHashId();
    return resolveVisualizerId(hashId);
  });
  const [sidebarWidth, setSidebarWidth] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PLATFORM_SIDEBAR_WIDTH_KEY);
    } catch {
      return null;
    }
  });

  // Sync hash on mount
  useEffect(() => {
    const resolvedId = resolveVisualizerId(getHashId());
    if (getHashId() !== resolvedId) {
      setHashId(resolvedId);
    }
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const onHashChange = () => {
      const hashId = getHashId();
      const resolvedId = resolveVisualizerId(hashId);
      setActiveId(resolvedId);
      if (hashId !== resolvedId) setHashId(resolvedId);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Update document title and lang
  useEffect(() => {
    const copy = getPlatformCopy(lang);
    const [, pageTitle] = getVisualizerLabel(activeId, lang);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = `${pageTitle} | ${copy.documentSuffix}`;
  }, [activeId, lang]);

  const handleNavigate = useCallback((id: string) => {
    setHashId(id);
    setActiveId(id);
  }, []);

  const handleSidebarResize = useCallback((width: number) => {
    const cssWidth = `${Math.round(width)}px`;
    setSidebarWidth(cssWidth);
    try {
      localStorage.setItem(PLATFORM_SIDEBAR_WIDTH_KEY, cssWidth);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const ActiveApp = appRegistry[activeId] ?? appRegistry[getDefaultVisualizer().id];
  const copy = getPlatformCopy(lang);

  return (
    <section
      className="platform-shell"
      style={sidebarWidth ? ({ "--platform-sidebar-width": sidebarWidth } as React.CSSProperties) : undefined}
    >
      <div className="platform-utility-nav">
        <a className="platform-home-link" href="/" aria-label={copy.homeLabel}>
          <span aria-hidden="true">←</span>
          <span>{copy.homeLabel}</span>
        </a>
        <LanguageTabs />
      </div>
      <Sidebar activeId={activeId} onNavigate={handleNavigate} />
      <ResizeHandle onResize={handleSidebarResize} ariaLabel={copy.resizeLabel} />
      <main className="visualizer-frame" data-loading="false">
        <AppErrorBoundary
          key={activeId}
          title={lang === "zh" ? "可视化模块加载失败" : "Visualizer failed to load"}
          message={
            lang === "zh"
              ? "请重新加载后再试。已保存的设置不会被清除。"
              : "Reload and try again. Your saved settings will be kept."
          }
          retryLabel={lang === "zh" ? "重新加载" : "Reload"}
        >
          <Suspense fallback={<div className="app-loading" role="status" aria-live="polite">{copy.loadingLabel}</div>}>
            <ActiveApp />
          </Suspense>
        </AppErrorBoundary>
      </main>
    </section>
  );
}
