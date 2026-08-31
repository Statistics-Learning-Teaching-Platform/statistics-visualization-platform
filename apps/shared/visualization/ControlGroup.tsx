import type { ReactNode } from "react";

export function ControlGroup({
  title,
  description,
  children,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`control-group lab-control-group ${className}`.trim()}>
      <div className="control-group__heading">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      <div className="control-group__body">{children}</div>
    </section>
  );
}
