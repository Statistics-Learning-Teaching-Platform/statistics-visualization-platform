import { useEffect, useRef, useState } from "react";
import type { ChartSpec } from "../wals/types";

/**
 * Cross-bundle experiment telemetry.
 *
 * The portal shell (src/shell) and the lazily loaded experiment apps live in
 * separate bundles, so a plain module singleton would be duplicated. The store
 * therefore lives on globalThis: every bundle copy talks to the same object,
 * letting the shell's AI experiment assistant read the active experiment's
 * current parameters and outputs.
 */

export interface ExperimentTelemetryMetric {
  label: string;
  value: string;
  detail?: string;
}

export interface ExperimentTelemetryTable {
  title?: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ExperimentTelemetrySnapshot {
  appId: string;
  updatedAt: number;
  experiment: {
    title: string;
    description?: string;
    researchQuestion?: string;
    category?: string;
    exampleTitle?: string;
    exampleDescription?: string;
    teachingPoints?: string[];
  };
  parameters: Array<{
    id: string;
    label: string;
    value: number | string | boolean;
  }>;
  outputs: {
    headline?: string;
    narrative?: string;
    metrics?: ExperimentTelemetryMetric[];
    tables?: ExperimentTelemetryTable[];
    chartTitle?: string;
    chartSummary?: string;
    rawSampleSummary?: string;
    sampleMeansSummary?: string;
    dataSummary?: string;
    changeSummary?: string;
  };
}

const STORE_KEY = "__statmindExperimentTelemetry";

type SnapshotListener = (snapshot: ExperimentTelemetrySnapshot | undefined) => void;

interface TelemetryStore {
  snapshots: Map<string, ExperimentTelemetrySnapshot>;
  listeners: Map<string, Set<SnapshotListener>>;
}

function resolveStore(): TelemetryStore {
  const existing = (globalThis as Record<string, unknown>)[STORE_KEY] as TelemetryStore | undefined;
  if (existing) return existing;
  const store: TelemetryStore = { snapshots: new Map(), listeners: new Map() };
  (globalThis as Record<string, unknown>)[STORE_KEY] = store;
  return store;
}

export function publishExperimentSnapshot(snapshot: ExperimentTelemetrySnapshot): void {
  const store = resolveStore();
  store.snapshots.set(snapshot.appId, snapshot);
  for (const listener of store.listeners.get(snapshot.appId) ?? []) {
    listener(snapshot);
  }
}

export function clearExperimentSnapshot(appId: string): void {
  const store = resolveStore();
  if (!store.snapshots.has(appId)) return;
  store.snapshots.delete(appId);
  for (const listener of store.listeners.get(appId) ?? []) {
    listener(undefined);
  }
}

export function getExperimentSnapshot(appId: string): ExperimentTelemetrySnapshot | undefined {
  return resolveStore().snapshots.get(appId);
}

export function subscribeExperimentSnapshot(appId: string, listener: SnapshotListener): () => void {
  const store = resolveStore();
  const listeners = store.listeners.get(appId) ?? new Set<SnapshotListener>();
  listeners.add(listener);
  store.listeners.set(appId, listeners);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) store.listeners.delete(appId);
  };
}

/** Publisher side: announce the current snapshot and retract it on unmount. */
export function useExperimentTelemetryPublisher(
  snapshot: ExperimentTelemetrySnapshot | undefined,
): void {
  const latest = useRef(snapshot);
  latest.current = snapshot;
  useEffect(() => {
    if (snapshot) publishExperimentSnapshot(snapshot);
  }, [snapshot]);
  useEffect(() => {
    const appId = latest.current?.appId;
    return () => {
      if (appId) clearExperimentSnapshot(appId);
    };
  }, []);
}

/** Consumer side (the shell): follows the live snapshot for one app. */
export function useExperimentSnapshot(appId: string): ExperimentTelemetrySnapshot | undefined {
  const [snapshot, setSnapshot] = useState<ExperimentTelemetrySnapshot | undefined>(() =>
    getExperimentSnapshot(appId),
  );
  useEffect(() => {
    setSnapshot(getExperimentSnapshot(appId));
    return subscribeExperimentSnapshot(appId, setSnapshot);
  }, [appId]);
  // Effects run after render. Never expose the previous app's snapshot during
  // the render in which a hash navigation changes appId.
  return snapshot?.appId === appId ? snapshot : undefined;
}

const RAW_SAMPLE_PREVIEW = 60;

/** Bounded numeric digest used for raw draws and accumulated sample means. */
export function summarizeNumberSeries(label: string, values: number[]): string {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) {
    return `${label}: input=${values.length}, finite=0, omitted non-finite=${values.length}, preview sent=0, preview truncated=0 (no finite data yet).`;
  }
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const variance =
    finite.length > 1
      ? finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (finite.length - 1)
      : 0;
  const fmt = (value: number) => (Math.abs(value) >= 1000 ? value.toFixed(1) : value.toFixed(3));
  const preview = finite
    .slice(0, RAW_SAMPLE_PREVIEW)
    .map((value) => (Number.isInteger(value) ? String(value) : value.toFixed(3)))
    .join(", ");
  const previewCount = Math.min(finite.length, RAW_SAMPLE_PREVIEW);
  return [
    `${label}: input=${values.length}, finite=${finite.length}, omitted non-finite=${values.length - finite.length}, mean=${fmt(mean)}, sd=${fmt(Math.sqrt(variance))}, min=${fmt(Math.min(...finite))}, max=${fmt(Math.max(...finite))}.`,
    `${label} preview: sent=${previewCount}, truncated=${finite.length - previewCount}; first ${previewCount} finite values in source order: ${preview}${finite.length > previewCount ? " …" : ""}`,
  ].join("\n");
}

function previewPoints(points: Array<{ x: number; y: number }>, limit = 12): string {
  return points
    .slice(0, limit)
    .map((point) => `(${point.x}, ${point.y})`)
    .join(" ");
}

function pointPreviewSummary(
  label: string,
  points: Array<{ x: number; y: number }>,
  limit = 12,
): string {
  const sent = Math.min(points.length, limit);
  return `${label}: original=${points.length}, sent=${sent}, truncated=${points.length - sent}; first points (x, y): ${previewPoints(points, limit) || "none"}.`;
}

function boundedEntries<T>(values: T[], limit: number): { sent: T[]; summary: string } {
  const sent = values.slice(0, limit);
  return {
    sent,
    summary: `original=${values.length}, sent=${sent.length}, truncated=${values.length - sent.length}`,
  };
}

function referenceSummary(
  references: Array<{ axis: "x" | "y"; value: number; label?: string }> | undefined,
): string | undefined {
  if (!references?.length) return undefined;
  const bounded = boundedEntries(references, 12);
  return `Reference lines: ${bounded.summary}; ${bounded.sent
    .map(
      (reference) =>
        `${reference.axis}=${reference.value}${reference.label ? ` (${reference.label})` : ""}`,
    )
    .join("; ")}.`;
}

function legendSummary(
  legend: Array<{ label: string; shape?: string }> | undefined,
): string | undefined {
  if (!legend?.length) return undefined;
  const bounded = boundedEntries(legend, 12);
  return `Legend: ${bounded.summary}; ${bounded.sent
    .map((item) => `${item.label}${item.shape ? ` [${item.shape}]` : ""}`)
    .join("; ")}.`;
}

/**
 * Deterministic textual digest of a chart spec: enough concrete numbers for
 * the AI tutor to reason about the visible figure without seeing the pixels.
 */
export function summarizeChartSpec(spec: ChartSpec): { title: string; summary: string } {
  const axes = `"${spec.xLabel}" vs "${spec.yLabel}"`;
  switch (spec.type) {
    case "scatter": {
      const extraLines = boundedEntries(spec.lines ?? [], 6);
      const contours = boundedEntries(spec.contours ?? [], 6);
      const circles = boundedEntries(spec.circles ?? [], 12);
      const lines = [
        `Chart (scatter): "${spec.title}", axes ${axes}, ${spec.points.length} points.`,
        pointPreviewSummary("Scatter points", spec.points),
        `Configured domains: x=${spec.xDomain ? `[${spec.xDomain[0]}, ${spec.xDomain[1]}]` : "auto"}, y=${spec.yDomain ? `[${spec.yDomain[0]}, ${spec.yDomain[1]}]` : "auto"}; point labels visible=${Boolean(spec.showPointLabels)}.`,
      ];
      if (spec.line) {
        lines.push(pointPreviewSummary(`Overlay line "${spec.line.label}"`, spec.line.points));
      }
      lines.push(`Additional line series: ${extraLines.summary}.`);
      for (const extra of extraLines.sent) {
        lines.push(pointPreviewSummary(`Line "${extra.label}"`, extra.points, 8));
      }
      lines.push(`Contour series: ${contours.summary}.`);
      for (const contour of contours.sent) {
        lines.push(pointPreviewSummary(`Contour "${contour.label}"`, contour.points, 8));
      }
      lines.push(
        `Circles: ${circles.summary}; ${
          circles.sent
            .map(
              (circle) =>
                `center=(${circle.cx}, ${circle.cy}), radius=${circle.radius}${circle.label ? ` (${circle.label})` : ""}`,
            )
            .join("; ") || "none"
        }.`,
      );
      lines.push(referenceSummary(spec.references) ?? "Reference lines: original=0, sent=0, truncated=0.");
      const legend = legendSummary(spec.legend);
      if (legend) lines.push(legend);
      return { title: spec.title, summary: lines.join("\n").slice(0, 6_000) };
    }
    case "line": {
      const series = boundedEntries(spec.series, 8);
      const areas = boundedEntries(spec.areas ?? [], 6);
      const lines = [
        `Chart (line): "${spec.title}", axes ${axes}.`,
        `Line series: ${series.summary}.`,
        ...series.sent.map((item) =>
          pointPreviewSummary(`Series "${item.label}"`, item.points, 8),
        ),
        `Filled areas: ${areas.summary}.`,
        ...areas.sent.map((area, index) =>
          pointPreviewSummary(`Area "${area.label ?? `area ${index + 1}`}"`, area.points, 8),
        ),
        `Configured domains: x=${spec.xDomain ? `[${spec.xDomain[0]}, ${spec.xDomain[1]}]` : "auto"}, y=${spec.yDomain ? `[${spec.yDomain[0]}, ${spec.yDomain[1]}]` : "auto"}.`,
      ];
      lines.push(referenceSummary(spec.references) ?? "Reference lines: original=0, sent=0, truncated=0.");
      const legend = legendSummary(spec.legend);
      if (legend) lines.push(legend);
      return { title: spec.title, summary: lines.join("\n").slice(0, 6_000) };
    }
    case "bars": {
      const top = [...spec.bars].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 10);
      const lines = [
        `Chart (bars): "${spec.title}", axes ${axes}, ${spec.bars.length} bars.`,
        `Magnitude-ranked bar preview: original=${spec.bars.length}, sent=${top.length}, truncated=${spec.bars.length - top.length}; ${top.map((bar) => `${bar.label}=${bar.value}${bar.x === undefined ? "" : ` (x=${bar.x})`}`).join(", ") || "none"}.`,
        `Configured y domain: ${spec.yDomain ? `[${spec.yDomain[0]}, ${spec.yDomain[1]}]` : "auto"}.`,
        referenceSummary(spec.references) ?? "Reference lines: original=0, sent=0, truncated=0.",
      ];
      const legend = legendSummary(spec.legend);
      if (legend) lines.push(legend);
      return {
        title: spec.title,
        summary: lines.join("\n").slice(0, 6_000),
      };
    }
    case "intervals": {
      return {
        title: spec.title,
        summary: [
          `Chart (intervals): "${spec.title}", axes ${axes}, ${spec.intervals.length} intervals.`,
          spec.intervals.length
            ? `Interval preview: original=${spec.intervals.length}, sent=${Math.min(spec.intervals.length, 12)}, truncated=${Math.max(0, spec.intervals.length - 12)}; first intervals (label, lower, center, upper): ${spec.intervals
                .slice(0, 12)
                .map(
                  (interval) =>
                    `${interval.label}[${interval.lower}, ${interval.upper}] ≈ ${interval.center}`,
                )
                .join("; ")}.`
            : "No intervals drawn yet.",
          spec.reference !== undefined
            ? `Vertical reference at ${spec.reference}${spec.referenceLabel ? ` (${spec.referenceLabel})` : ""}.`
            : "",
          `Configured x domain: ${spec.xDomain ? `[${spec.xDomain[0]}, ${spec.xDomain[1]}]` : "auto"}.`,
          legendSummary(spec.legend) ?? "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
    case "clt": {
      const populationBars = [...spec.populationBars]
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 6);
      const sampleMeanBars = [...spec.sampleMeanBars]
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 6);
      return {
        title: spec.title,
        summary: [
          `Chart (population vs sampling distribution): "${spec.title}"; panels="${spec.populationTitle}" and "${spec.samplingTitle}"; x axis="${spec.xLabel}", y axis="${spec.yLabel}".`,
          `Population bars: original=${spec.populationBars.length}, sent=${populationBars.length}, truncated=${spec.populationBars.length - populationBars.length}; magnitude-ranked preview=${populationBars.map((bar) => `${bar.label}=${bar.value}`).join(", ") || "none"}.`,
          `Sample-mean bars: original=${spec.sampleMeanBars.length}, sent=${sampleMeanBars.length}, truncated=${spec.sampleMeanBars.length - sampleMeanBars.length}; magnitude-ranked preview=${sampleMeanBars.map((bar) => `${bar.label}=${bar.value}`).join(", ") || "none"}.`,
          pointPreviewSummary("Normal-approximation curve", spec.normalCurve, 12),
          `Population mean marker at ${spec.populationMean}${spec.populationMeanLabel ? ` (${spec.populationMeanLabel})` : ""}; normal approximation label=${spec.normalApproximationLabel ?? "none"}; x domain [${spec.xDomain[0]}, ${spec.xDomain[1]}].`,
        ].join("\n"),
      };
    }
    case "mcmc": {
      const contours = boundedEntries(spec.contours, 6);
      return {
        title: spec.title,
        summary: [
          `Chart (MCMC): "${spec.title}", axes ${axes}; target="${spec.targetLabel}", trace="${spec.traceLabel}".`,
          pointPreviewSummary("Posterior samples", spec.samples, 12),
          pointPreviewSummary(`Recent path${spec.recentPathLabel ? ` (${spec.recentPathLabel})` : ""}`, spec.path, 12),
          `Contour series: ${contours.summary}.`,
          ...contours.sent.map((contour) =>
            pointPreviewSummary(`Contour "${contour.label}"`, contour.points, 8),
          ),
          pointPreviewSummary("X trace (iteration, x)", spec.traceX, 12),
          pointPreviewSummary("Y trace (iteration, y)", spec.traceY, 12),
          `Domains: x [${spec.xDomain[0]}, ${spec.xDomain[1]}], y [${spec.yDomain[0]}, ${spec.yDomain[1]}].`,
          `Labels: current state=${spec.currentStateLabel ?? "none"}; target density=${spec.targetDensityLabel ?? "none"}.`,
        ]
          .join("\n")
          .slice(0, 6_000),
      };
    }
    case "anova": {
      const groups = boundedEntries(spec.groups, 12);
      return {
        title: spec.title,
        summary: [
          `Chart (grouped dot plot): "${spec.title}", axes ${axes}.`,
          `Grand mean ${spec.grandMean}${spec.grandMeanLabel ? ` (${spec.grandMeanLabel})` : ""}; groups: ${groups.summary}.`,
          ...groups.sent.map((group) => {
            const sent = Math.min(group.values.length, 10);
            return `Group "${group.label}": n=${group.values.length}, mean=${group.mean}, value preview sent=${sent}, truncated=${group.values.length - sent}; first values=${group.values.slice(0, 10).join(", ") || "none"}.`;
          }),
          `Labels: observations=${spec.observationsLabel ?? "none"}; group means=${spec.groupMeanLabel ?? "none"}.`,
        ]
          .join("\n")
          .slice(0, 6_000),
      };
    }
  }
}
