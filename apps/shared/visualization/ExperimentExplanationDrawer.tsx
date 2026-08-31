import type { ReactNode } from "react";

export function ExperimentExplanationDrawer({ open, onToggle, children, label }: { open: boolean; onToggle: () => void; children: ReactNode; label: string }) {
  const contentId = "experiment-explanation-content";
  return (
    <section className="lab-explanation" data-teaching-drawer="true">
      <button type="button" className="lab-explanation__trigger" aria-expanded={open} aria-controls={contentId} onClick={onToggle}>
        <span aria-hidden="true">ⓘ</span>{label}<span className="lab-explanation__chevron" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div id={contentId} className="lab-explanation__content" hidden={!open}>{children}</div>
    </section>
  );
}
