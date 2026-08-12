import type { ReactNode } from "react";

interface ReadingGuideProps {
  title: ReactNode;
  children: ReactNode;
}

export function ReadingGuide({ title, children }: ReadingGuideProps) {
  return (
    <div className="observation-prompt" data-reading-guide="true">
      <span aria-hidden="true">◎</span>
      <div>
        <strong>{title}</strong>
        <div className="reading-guide__body">{children}</div>
      </div>
    </div>
  );
}
