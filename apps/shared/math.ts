// Special-function + chart helpers consolidated from the per-app engine.ts copies.
// Behavior-preserving: the `histogram` unification keys off `domain` (see comment).
//
// normalCdf/normalPdf delegate to jStat so the whole platform shares ONE
// implementation (previously math.ts used an erf approximation while
// type-error/App.tsx and distributions.ts used jStat, causing tiny but real
// numerical disagreements between modules that should agree).

import jStat from "jstat";
import { formatNumber, mean } from "./format";

export interface ChartBar {
  label: string;
  value: number;
}

export function normalPdf(x: number, mu = 0, sd = 1): number {
  return jStat.normal.pdf(x, mu, sd);
}

export function normalCdf(x: number, mu = 0, sd = 1): number {
  return jStat.normal.cdf(x, mu, sd);
}

export function normalInv(p: number, mu = 0, sd = 1): number {
  return jStat.normal.inv(p, mu, sd);
}

export function linearRegression(points: Array<{ x: number; y: number }>) {
  const xMean = mean(points.map((point) => point.x));
  const yMean = mean(points.map((point) => point.y));
  const sxx = points.reduce((sum, point) => sum + (point.x - xMean) ** 2, 0);
  const sxy = points.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0);
  // Degenerate x variance: slope is undefined. Return a zero-slope fit through
  // (xMean, yMean) so callers (regression app, outlier diagnostics, WALS
  // regression example) get finite numbers instead of Infinity/NaN. Mirrors the
  // sxx guard already present in computeOutlierDiagnostics.
  if (sxx <= Number.EPSILON) {
    const sst = points.reduce((sum, point) => sum + (point.y - yMean) ** 2, 0);
    return { slope: 0, intercept: yMean, rSquared: 0, sse: sst };
  }
  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;
  const fitted = points.map((point) => intercept + slope * point.x);
  const sst = points.reduce((sum, point) => sum + (point.y - yMean) ** 2, 0);
  const sse = points.reduce((sum, point, index) => sum + (point.y - fitted[index]) ** 2, 0);
  const rSquared = sst <= Number.EPSILON ? 0 : 1 - sse / sst;

  return { slope, intercept, rSquared, sse };
}

/**
 * Bin `values` into `count` equal-width histogram bars.
 *
 * Behavior preservation across the two historical call shapes:
 * - `domain` provided (CLT app): min/max come from `domain`, so out-of-range
 *   values exist and are SKIPPED (`continue`) — matches the old CLT engine.
 * - `domain` absent (other 9 apps): min/max are derived from `values` itself,
 *   so no value can ever be out of range and the `continue` is dead code; only
 *   the clamp into the edge bin applies — matches the old standard engine.
 * The two guards key off mutually-exclusive runtime conditions, so they coexist.
 */
export function histogram(values: number[], count = 18, domain?: [number, number]): ChartBar[] {
  const min = domain?.[0] ?? values.reduce((a, b) => Math.min(a, b), Infinity);
  const max = domain?.[1] ?? values.reduce((a, b) => Math.max(a, b), -Infinity);
  const range = max - min;

  // All values identical: show a single centered spike instead of piling
  // everything into bin[0], which made a constant sample look left-skewed.
  if (range === 0) {
    const centerIndex = Math.floor(count / 2);
    return Array.from({ length: count }, (_, index) => ({
      label: formatNumber(min, 2),
      value: index === centerIndex ? values.length : 0,
    }));
  }

  const width = range / count;
  const counts = new Uint32Array(count);
  for (const value of values) {
    if (value < min || value > max) continue;
    const index = Math.min(count - 1, Math.max(0, Math.floor((value - min) / width)));
    counts[index] += 1;
  }
  return Array.from(counts, (value, index) => ({
    label: formatNumber(min + width * (index + 0.5), 2),
    value,
  }));
}
