import { getPlatformCopy, getVisualizerLabel, useLanguage } from "@stats-viz/shared/i18n";
import {
  loadWorkspaceLayout,
  PanelResizeHandle,
  saveWorkspaceLayout,
} from "@stats-viz/shared/visualization";
import type { ComponentType, CSSProperties, ErrorInfo, ReactNode } from "react";
import { Component, Suspense, useCallback, useEffect, useState } from "react";
import { getDefaultVisualizer } from "../../scripts/apps";
import { EditorialDemoShell } from "../visual-demo/editorial/EditorialPrimitives";
import { appRegistry, loadVisualizerComponent } from "./appRegistry";
import { ExperimentTutor } from "./ExperimentTutor";
import { Sidebar } from "./Sidebar";
import "../visual-demo/editorial-tailwind.css";
import "../visual-demo/editorial/editorial-demo.css";
import "./editorial-platform.css";

interface VisualizerErrorBoundaryProps {
  appId: string;
  language: "zh" | "en";
  children: ReactNode;
}

interface VisualizerErrorBoundaryState {
  error: Error | null;
}

class VisualizerErrorBoundary extends Component<
  VisualizerErrorBoundaryProps,
  VisualizerErrorBoundaryState
> {
  state: VisualizerErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): VisualizerErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[AppShell] Failed to render visualizer "${this.props.appId}"`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const isChinese = this.props.language === "zh";
    return (
      <section className="visualizer-error" role="alert">
        <p className="visualizer-error__eyebrow">
          {isChinese ? "MODULE LOAD ERROR" : "MODULE LOAD ERROR"}
        </p>
        <h2>{isChinese ? "实验模块未能正常载入" : "The lab module could not load"}</h2>
        <p>
          {isChinese
            ? "页面没有丢失。请重新载入实验模块；如果问题持续，错误信息会保留在控制台中用于定位。"
            : "Your work is safe. Reload the lab module; diagnostic details remain available in the console."}
        </p>
        <code>{this.state.error.message}</code>
        <button type="button" onClick={() => window.location.reload()}>
          {isChinese ? "重新载入实验" : "Reload lab"}
        </button>
      </section>
    );
  }
}

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

export function AppShell() {
  const lang = useLanguage();
  const [activeId, setActiveId] = useState<string>(() => {
    const hashId = getHashId();
    return resolveVisualizerId(hashId);
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => loadWorkspaceLayout().leftPanelWidth);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  useEffect(() => {
    const closeDirectory = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDirectoryOpen(false);
    };
    window.addEventListener("keydown", closeDirectory);
    return () => window.removeEventListener("keydown", closeDirectory);
  }, []);
  const [ActiveApp, setActiveApp] = useState<ComponentType | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setActiveApp(null);

    loadVisualizerComponent(activeId)
      .then((component) => {
        if (cancelled) return;
        setActiveApp(() => component);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error : new Error("Unknown visualizer loading error"),
        );
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const handleNavigate = useCallback((id: string) => {
    setHashId(id);
    setActiveId(id);
  }, []);

  const handleSidebarResize = useCallback((width: number) => {
    setSidebarWidth(width);
    const current = loadWorkspaceLayout();
    saveWorkspaceLayout({ ...current, leftPanelWidth: width });
  }, []);

  const copy = getPlatformCopy(lang);

  return (
    <EditorialDemoShell current="experiment" mode="workspace" siteMode="product">
      <section
        id="main-content"
        className="platform-shell ed-live-lab-shell"
        data-directory-open={String(directoryOpen)}
        style={{ "--platform-sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <button
          type="button"
          className="lab-directory-toggle"
          aria-expanded={directoryOpen}
          aria-controls="lab-directory-sidebar"
          onClick={() => setDirectoryOpen((open) => !open)}
        >
          {lang === "zh" ? "实验目录" : "Lab index"}
        </button>
        <Sidebar activeId={activeId} onNavigate={handleNavigate} id="lab-directory-sidebar" />
        <PanelResizeHandle
          side="left"
          value={sidebarWidth}
          min={185}
          max={240}
          ariaLabel={copy.resizeLabel}
          containerSelector=".platform-shell"
          onChange={handleSidebarResize}
        />
        <main className="visualizer-frame" data-loading={isLoading}>
          {loadError ? (
            <section className="visualizer-error" role="alert">
              <p className="visualizer-error__eyebrow">MODULE LOAD ERROR</p>
              <h2>{lang === "zh" ? "实验模块未能正常载入" : "The lab module could not load"}</h2>
              <code>{loadError.message}</code>
              <button type="button" onClick={() => window.location.reload()}>
                {lang === "zh" ? "重新载入实验" : "Reload lab"}
              </button>
            </section>
          ) : isLoading ? (
            <output className="app-loading" aria-live="polite">
              {copy.loadingLabel}
            </output>
          ) : ActiveApp ? (
            <VisualizerErrorBoundary key={activeId} appId={activeId} language={lang}>
              <Suspense
                fallback={
                  <output className="app-loading" aria-live="polite">
                    {copy.loadingLabel}
                  </output>
                }
              >
                <ActiveApp />
              </Suspense>
            </VisualizerErrorBoundary>
          ) : (
            <section className="visualizer-error" role="alert">
              <p className="visualizer-error__eyebrow">MODULE NOT FOUND</p>
              <h2>{lang === "zh" ? "没有找到实验模块" : "Lab module not found"}</h2>
              <button type="button" onClick={() => window.location.reload()}>
                {lang === "zh" ? "重新载入" : "Reload"}
              </button>
            </section>
          )}
        </main>
      </section>
      <ExperimentTutor activeId={activeId} />
    </EditorialDemoShell>
  );
}
