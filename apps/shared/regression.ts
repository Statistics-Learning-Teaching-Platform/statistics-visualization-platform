// Regression diagnostics shared between the standalone regression app
// (apps/regression/src/App.tsx) and the WALS engine regression example
// (apps/shared/wals/engine/regression.ts).
//
// Previously the standalone app re-implemented residual / leverage / Cook's
// distance calculations inline; these are now the single source of truth so
// both surfaces agree on what counts as an outlier.

import { mean } from "./format";
import { linearRegression } from "./math";

export interface RegressionPoint {
  x: number;
  y: number;
  outlier?: boolean;
}

/**
 * Sum of squared errors for a candidate (slope, intercept) against `data`.
 * Used by the regression app's interactive "draw your own line" SSE compare.
 */
export function computeSSE(data: RegressionPoint[], slope: number, intercept: number): number {
  return data.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
}

export interface OutlierFlags {
  /** Studentized residual magnitude (|residual| / (rmse * sqrt(1 - leverage))). */
  studentized: number;
  /** Cook's distance for the point. */
  cooks: number;
  /** True when the point should be flagged as an outlier. */
  isOutlier: boolean;
}

/**
 * Flag influential outliers in a regression dataset using studentized
 * residuals and Cook's distance. A point is flagged when:
 *   - |studentized| >= 2.5, OR
 *   - |studentized| >= 2 AND cooks > 4/n
 *
 * Returns one entry per input point (in order). Datasets with fewer than 8
 * points or degenerate x variance return all-zero flags.
 */
export function computeOutlierDiagnostics(data: RegressionPoint[]): OutlierFlags[] {
  if (data.length < 8) {
    return data.map(() => ({ studentized: 0, cooks: 0, isOutlier: false }));
  }

  const xs = data.map((p) => p.x);
  const xMean = mean(xs);
  const sxx = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  if (sxx <= Number.EPSILON) {
    return data.map(() => ({ studentized: 0, cooks: 0, isOutlier: false }));
  }

  const { slope, intercept } = linearRegression(data);
  const residuals = data.map((p) => p.y - (intercept + slope * p.x));
  const mse = residuals.reduce((s, r) => s + r * r, 0) / Math.max(data.length - 2, 1);
  if (!Number.isFinite(mse) || mse <= Number.EPSILON) {
    return data.map(() => ({ studentized: 0, cooks: 0, isOutlier: false }));
  }

  const rmse = Math.sqrt(mse);
  const cutoff = 4 / data.length;
  return data.map((p, i) => {
    const leverage = Math.min(0.999999, 1 / data.length + (p.x - xMean) ** 2 / sxx);
    const studentized = Math.abs(residuals[i]) / (rmse * Math.sqrt(Math.max(1 - leverage, 1e-9)));
    const cooks = (residuals[i] ** 2 / (2 * mse)) * (leverage / Math.max((1 - leverage) ** 2, 1e-9));
    return {
      studentized,
      cooks,
      isOutlier: studentized >= 2.5 || (studentized >= 2 && cooks > cutoff),
    };
  });
}

/**
 * Return a copy of `data` with `outlier: true` set on influential points.
 * Idempotent: if the dataset already carries outlier flags it is returned as-is.
 */
export function annotateOutliers<T extends RegressionPoint>(data: T[]): T[] {
  if (data.some((p) => p.outlier)) return data;
  const flags = computeOutlierDiagnostics(data);
  return data.map((p, i) => (flags[i].isOutlier ? { ...p, outlier: true } : p));
}
