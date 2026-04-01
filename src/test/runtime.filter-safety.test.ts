import { describe, expect, it, vi } from "vitest";

vi.mock("../utils/opencv", () => ({
  isOpenCVReady: () => false,
  getOpenCV: () => {
    throw new Error("opencv unavailable");
  }
}));

import { applyFilterWithFallback } from "../utils/opencvFilters";
import {
  createAsyncTaskTokenManager,
  isValidFilterImageDimensions,
  normalizeFilterParams,
  safeDivide
} from "../utils/filterRuntimeGuards";

describe("runtime filter safety guards", () => {
  it("normalizes invalid numeric params deterministically", () => {
    const normalized = normalizeFilterParams(
      "gammacorrection",
      {
        gamma: 0,
        kernelSize: Number.NaN as number,
        sigma: Number.POSITIVE_INFINITY,
        gridSize: Number.NaN as number,
        lowThreshold: -999,
        highThreshold: 999
      } as any,
      { width: 2, height: 2 }
    );

    expect(normalized.gamma).toBeGreaterThan(0);
    expect(Number.isFinite(normalized.sigma)).toBe(true);
    expect(normalized.kernelSize % 2).toBe(1);
    expect(normalized.gridSize).toBe(2);
    expect(normalized.lowThreshold).toBeGreaterThanOrEqual(0);
    expect(normalized.highThreshold).toBeLessThanOrEqual(255);
  });

  it("guards tiny image tile params to avoid zero-sized tiles", () => {
    const normalized = normalizeFilterParams(
      "clahe",
      { gridSize: 999 } as any,
      { width: 1, height: 1 }
    );

    expect(normalized.gridSize).toBe(1);
  });

  it("contains divide-by-zero paths with safe division fallback", () => {
    expect(safeDivide(10, 0, 123)).toBe(123);
    expect(safeDivide(10, Number.NaN, 456)).toBe(456);
    expect(safeDivide(10, 2, 0)).toBe(5);
  });

  it("skips filter execution for invalid image dimensions", async () => {
    const originalFn = vi.fn();
    const opencvFn = vi.fn();

    await applyFilterWithFallback(
      { canvas: { width: 0, height: 10 } } as unknown as CanvasRenderingContext2D,
      "clahe",
      {} as any,
      originalFn,
      opencvFn
    );

    expect(isValidFilterImageDimensions(0, 10)).toBe(false);
    expect(originalFn).not.toHaveBeenCalled();
    expect(opencvFn).not.toHaveBeenCalled();
  });

  it("keeps non-OpenCV fallback active when OpenCV path is unavailable", async () => {
    const originalFn = vi.fn();
    const opencvFn = vi.fn(() => {
      throw new Error("opencv unavailable");
    });

    await applyFilterWithFallback(
      { canvas: { width: 8, height: 8 } } as unknown as CanvasRenderingContext2D,
      "gammacorrection",
      { gamma: 0 } as any,
      originalFn,
      opencvFn
    );

    expect(originalFn).toHaveBeenCalledTimes(1);
    const normalizedParams = originalFn.mock.calls[0]?.[1];
    expect(normalizedParams.gamma).toBeGreaterThan(0);
  });

  it("prevents stale async tokens from committing old work", () => {
    const manager = createAsyncTaskTokenManager();
    const firstToken = manager.nextToken();
    const secondToken = manager.nextToken();

    expect(manager.isCurrent(firstToken)).toBe(false);
    expect(manager.isCurrent(secondToken)).toBe(true);

    manager.invalidate();
    expect(manager.isCurrent(secondToken)).toBe(false);
  });
});
