import { useCallback, useRef } from "react";

export const WORKSPACE_LAYOUT_KEY = "statmind-workspace-layout-v2";

export const WORKSPACE_LAYOUT_DEFAULTS = {
  leftPanelWidth: 195,
  rightPanelWidth: 285,
} as const;

export type WorkspaceLayout = {
  version: 2;
  leftPanelWidth: number;
  rightPanelWidth: number;
};

export type ResizeSide = "left" | "right";

const LEGACY_LEFT_KEY = "statistics-platform-sidebar-width";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteWidth(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? clamp(Math.round(numeric), min, max) : fallback;
}

export function loadWorkspaceLayout(storage: Pick<Storage, "getItem"> = localStorage): WorkspaceLayout {
  try {
    const raw = storage.getItem(WORKSPACE_LAYOUT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<WorkspaceLayout>) : {};
    const legacyLeft = storage.getItem(LEGACY_LEFT_KEY);
    return {
      version: 2,
      leftPanelWidth: finiteWidth(parsed.leftPanelWidth ?? legacyLeft, WORKSPACE_LAYOUT_DEFAULTS.leftPanelWidth, 185, 240),
      rightPanelWidth: finiteWidth(parsed.rightPanelWidth, WORKSPACE_LAYOUT_DEFAULTS.rightPanelWidth, 270, 340),
    };
  } catch {
    return { version: 2, ...WORKSPACE_LAYOUT_DEFAULTS };
  }
}

export function saveWorkspaceLayout(
  layout: WorkspaceLayout,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  try {
    storage.setItem(WORKSPACE_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // localStorage is optional, especially in embedded or private contexts.
  }
}

interface PanelResizeHandleProps {
  side: ResizeSide;
  value: number;
  min: number;
  max: number;
  ariaLabel: string;
  containerSelector: string;
  onChange: (value: number) => void;
}

export function PanelResizeHandle({
  side,
  value,
  min,
  max,
  ariaLabel,
  containerSelector,
  onChange,
}: PanelResizeHandleProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const next = side === "left" ? clientX - rect.left : rect.right - clientX;
      onChange(clamp(next, min, max));
    },
    [max, min, onChange, side],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      const container = handle.closest<HTMLElement>(containerSelector);
      if (!container) return;
      containerRef.current = container;
      handle.setPointerCapture(event.pointerId);
      document.body.classList.add("is-resizing-panels");

      const onPointerMove = (moveEvent: PointerEvent) => updateFromPointer(moveEvent.clientX);
      const onPointerUp = () => {
        document.body.classList.remove("is-resizing-panels");
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
    },
    [containerSelector, updateFromPointer],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const signedDirection = side === "left" ? direction : -direction;
      onChange(clamp(value + signedDirection * (event.shiftKey ? 24 : 8), min, max));
    },
    [max, min, onChange, side, value],
  );

  return (
    <div
      className={`workspace-resize-handle workspace-resize-handle--${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    />
  );
}
