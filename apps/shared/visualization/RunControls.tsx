import type { ReactNode } from "react";

export function RunControls({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`run-controls lab-run-controls ${className}`.trim()}>{children}</div>;
}
