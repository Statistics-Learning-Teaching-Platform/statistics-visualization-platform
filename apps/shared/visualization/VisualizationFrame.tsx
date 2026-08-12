import type { ReactNode } from "react";

interface VisualizationFrameProps {
  content: ReactNode;
  sidebar: ReactNode;
  busy?: boolean;
  className?: string;
}

export function VisualizationFrame({
  content,
  sidebar,
  busy = false,
  className = "",
}: VisualizationFrameProps) {
  return (
    <div
      className={`module-shell visualization-frame ${className}`.trim()}
      aria-busy={busy}
      data-visualization-frame="true"
    >
      <main className="module-layout">
        <section className="experiment-board">{content}</section>
        <aside className="teaching-area">{sidebar}</aside>
      </main>
    </div>
  );
}
