import type { ReactNode } from "react";

interface ChartFrameProps {
  children: ReactNode;
  className?: string;
}

export function ChartFrame({ children, className = "" }: ChartFrameProps) {
  return (
    <div className={`chart-frame lab-visualization-panel ${className}`.trim()} data-chart-frame="true">
      {children}
    </div>
  );
}
