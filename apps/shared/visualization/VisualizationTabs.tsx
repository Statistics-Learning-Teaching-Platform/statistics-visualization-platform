import { useId } from "react";
import type { ReactNode } from "react";

export interface VisualizationTab { id: string; label: ReactNode; content: ReactNode; }

export function VisualizationTabs({ tabs, activeId, onChange }: { tabs: VisualizationTab[]; activeId: string; onChange: (id: string) => void }) {
  const instanceId = useId().replace(/:/g, "");
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  return (
    <section className="visualization-tabs" data-visualization-tabs="true">
      <div className="visualization-tabs__list" role="tablist">
        {tabs.map((tab) => {
          const tabId = `${instanceId}-tab-${tab.id}`;
          const panelId = `${instanceId}-panel-${tab.id}`;
          return <button key={tab.id} id={tabId} type="button" role="tab" aria-selected={tab.id === active?.id} aria-controls={panelId} tabIndex={tab.id === active?.id ? 0 : -1} className="visualization-tabs__tab" data-active={String(tab.id === active?.id)} onClick={() => onChange(tab.id)}>{tab.label}</button>;
        })}
      </div>
      <div id={active ? `${instanceId}-panel-${active.id}` : undefined} className="visualization-tabs__panel" role="tabpanel" aria-labelledby={active ? `${instanceId}-tab-${active.id}` : undefined}>{active?.content}</div>
    </section>
  );
}
