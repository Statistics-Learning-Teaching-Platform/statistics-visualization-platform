import { act, renderHook } from "@testing-library/react";
import { scaleLinear } from "d3";
import { describe, expect, it, vi } from "vitest";
import { DATASET_PATHS } from "../apps/regression/src/constants";
import {
  computeHoverInfo,
  getCustomLineParams,
  useCustomLine,
} from "../apps/regression/src/useCustomLine";
import { useDatasets } from "../apps/regression/src/useDatasets";

describe("regression app bootstrap", () => {
  it("bundles all declared datasets at build time", () => {
    const { datasets } = useDatasets();
    expect(datasets).toHaveLength(DATASET_PATHS.length);
    expect(datasets.every((d) => d.data.length > 0)).toBe(true);
  });

  it("seeds the initial selection with the first declared dataset", () => {
    const { datasets, initialId } = useDatasets();
    expect(initialId).toBe(datasets[0].id);
    expect(initialId).toBe("outlier-impact");
  });

  it("uses a hand-drawn line for diagnostics when it is present", () => {
    const result = computeHoverInfo(
      { x: 2, y: 8 },
      true,
      { slope: 1, intercept: 0 },
      { slope: 3, intercept: 1 },
    );

    expect(result).toMatchObject({ lineType: "custom", lineY: 7, residual: 1 });
  });

  it("does not misrepresent a vertical stroke as a horizontal fitted line", () => {
    expect(getCustomLineParams({ start: { x: 2, y: 1 }, end: { x: 2, y: 8 } })).toBeNull();
  });

  it("clears transient drag state when the browser cancels a pointer", () => {
    const svg = {
      viewBox: { baseVal: { width: 100, height: 100 } },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      setPointerCapture: vi.fn(),
      hasPointerCapture: () => true,
      releasePointerCapture: vi.fn(),
    };
    const pointer = {
      pointerId: 3,
      clientX: 10,
      clientY: 20,
      preventDefault: vi.fn(),
      currentTarget: svg,
    } as unknown as React.PointerEvent<SVGSVGElement>;
    const { result } = renderHook(() =>
      useCustomLine({
        scales: {
          xScale: scaleLinear().domain([0, 10]).range([0, 100]),
          yScale: scaleLinear().domain([0, 10]).range([100, 0]),
        },
        chartLayoutMargin: { left: 0, top: 0 },
        resetDeps: [],
      }),
    );

    act(() => result.current.handlers.handlePointerDown(pointer));
    expect(result.current.isDragging).toBe(true);
    act(() => result.current.handlers.handlePointerCancel(pointer));
    expect(result.current.isDragging).toBe(false);
    expect(result.current.tempLine).toEqual({ start: null, end: null });
    expect(svg.releasePointerCapture).toHaveBeenCalledWith(3);
  });
});
