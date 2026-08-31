import type { CSSProperties, ReactNode } from "react";
import { Children, Fragment, isValidElement, useEffect, useState } from "react";
import { useLanguage } from "../i18n";
import { ExperimentExplanationDrawer } from "./ExperimentExplanationDrawer";
import { loadWorkspaceLayout, PanelResizeHandle, saveWorkspaceLayout } from "./WorkspaceLayout";

interface VisualizationFrameProps {
  content: ReactNode;
  sidebar: ReactNode;
  /** Optional leading rail for experiments that need a three-column workbench. */
  leadingSidebar?: ReactNode;
  busy?: boolean;
  className?: string;
  moduleId?: string;
}

export function VisualizationFrame({
  content,
  sidebar,
  leadingSidebar,
  busy = false,
  className = "",
  moduleId,
}: VisualizationFrameProps) {
  const language = useLanguage();
  const [rightPanelWidth, setRightPanelWidth] = useState(
    () => loadWorkspaceLayout().rightPanelWidth,
  );
  const [parameterOpen, setParameterOpen] = useState(false);
  const [teachingOpen, setTeachingOpen] = useState(false);
  const hasLeadingSidebar = Boolean(leadingSidebar);
  const hasSidebar = Boolean(sidebar || leadingSidebar);

  useEffect(() => {
    const closeDrawers = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setParameterOpen(false);
      setTeachingOpen(false);
    };
    window.addEventListener("keydown", closeDrawers);
    return () => window.removeEventListener("keydown", closeDrawers);
  }, []);
  const updateRightPanelWidth = (width: number) => {
    setRightPanelWidth(width);
    const current = loadWorkspaceLayout();
    saveWorkspaceLayout({ ...current, rightPanelWidth: width });
  };

  const sidebarChildren = flattenSidebarChildren(sidebar);
  const operationalChildren = sidebarChildren.filter((child) => !isTeachingChild(child));
  const teachingChildren = sidebarChildren.filter(isTeachingChild);

  return (
    <div
      className={`module-shell visualization-frame${hasLeadingSidebar ? " three-column-frame" : ""} ${className}`.trim()}
      aria-busy={busy}
      data-visualization-frame="true"
      data-module-id={moduleId}
      data-has-sidebar={String(hasSidebar)}
      data-layout={hasLeadingSidebar ? "three-column" : "default"}
      style={
        {
          "--module-sidebar-width": `${hasSidebar ? rightPanelWidth : 0}px`,
        } as CSSProperties
      }
    >
      {hasSidebar && (
        <div
          className="lab-mobile-controls"
          aria-label={language === "zh" ? "实验工具" : "Lab tools"}
        >
          <button
            type="button"
            className="lab-mobile-control"
            aria-expanded={parameterOpen}
            aria-controls="lab-parameter-rail"
            onClick={() => setParameterOpen((open) => !open)}
          >
            {language === "zh" ? "参数" : "Parameters"}
          </button>
        </div>
      )}
      <main
        className={`module-layout ed-live-lab-layout${hasLeadingSidebar ? " ed-three-column-layout" : ""}`}
      >
        {hasLeadingSidebar ? (
          <>
            <aside
              id="lab-parameter-rail"
              aria-label={language === "zh" ? "实验参数" : "Experiment parameters"}
              className="teaching-area ed-leading-rail"
              data-parameter-open={String(parameterOpen)}
            >
              {leadingSidebar}
            </aside>
            <section className="experiment-board ed-lab-stage">{content}</section>
            <aside
              id="lab-statistics-rail"
              aria-label={language === "zh" ? "统计结果" : "Statistical results"}
              className="teaching-area ed-trailing-rail"
            >
              {sidebar}
            </aside>
          </>
        ) : (
          <>
            <section className="experiment-board ed-lab-stage">{content}</section>
            {hasSidebar && (
              <>
                <PanelResizeHandle
                  side="right"
                  value={rightPanelWidth}
                  min={270}
                  max={340}
                  ariaLabel="调整右侧参数面板宽度"
                  containerSelector=".module-layout"
                  onChange={updateRightPanelWidth}
                />
                <aside
                  id="lab-parameter-rail"
                  aria-label={language === "zh" ? "实验参数" : "Experiment parameters"}
                  className="teaching-area ed-parameter-rail"
                  data-parameter-open={String(parameterOpen)}
                >
                  {operationalChildren}
                  {teachingChildren.length > 0 && (
                    <ExperimentExplanationDrawer
                      open={teachingOpen}
                      onToggle={() => setTeachingOpen((open) => !open)}
                      label={language === "zh" ? "理解本实验" : "Understand this experiment"}
                    >
                      {teachingChildren}
                    </ExperimentExplanationDrawer>
                  )}
                </aside>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function flattenSidebarChildren(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      return flattenSidebarChildren(child.props.children);
    }
    return [child];
  });
}

function isTeachingChild(child: ReactNode): boolean {
  if (!isValidElement(child)) return false;
  const props = child.props as {
    className?: unknown;
    "data-formula-card"?: unknown;
    "data-observation-card"?: unknown;
  };
  if (props["data-formula-card"] || props["data-observation-card"]) return true;
  if (typeof props.className !== "string") return false;
  return (
    props.className.includes("teaching-panel") &&
    !props.className.includes("parameter-panel") &&
    !props.className.includes("control-panel")
  );
}
