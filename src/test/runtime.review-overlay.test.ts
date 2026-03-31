import { describe, expect, it, vi } from "vitest";

import type { ReviewDatasetRecord } from "../utils/reviewDataset";
import {
  canRenderSegmentationOverlay,
  clampReviewMaskOpacity,
  drawDetectionOverlayPrimitives,
  drawSegmentationOverlay,
  normalizeDetectionOverlayPrimitives
} from "../utils/reviewOverlay";
import { computeStandardTransform } from "../utils/viewTransforms";
import { createSyntheticFile } from "./runtimeTestHelpers";

const createDetectionRecord = (): ReviewDatasetRecord => ({
  basename: "sample",
  sourceImageName: "sample.png",
  sourceImageFile: createSyntheticFile("sample.png", { type: "image/png" }),
  annotationName: "sample.txt",
  annotationFile: createSyntheticFile("sample.txt", { content: "0 0.5 0.5 0.5 0.5" }),
  status: "matched",
  validation: { valid: true, reasons: [] },
  detection: {
    objects: [
      { classId: 2, className: "", x: 0.5, y: 0.5, width: 0.4, height: 0.2, line: 1 },
      { classId: 4, className: "car", x: 0.2, y: 0.2, width: 0.1, height: 0.1, line: 2 },
      { classId: 9, className: "bad", x: Number.NaN, y: 0.5, width: 0.2, height: 0.2, line: 3 },
      { classId: 5, className: "flat", x: 0.4, y: 0.4, width: 0, height: 0.2, line: 4 }
    ]
  }
});

const createSegmentationRecord = (status: ReviewDatasetRecord["status"] = "matched"): ReviewDatasetRecord => ({
  basename: "mask",
  sourceImageName: "mask.png",
  sourceImageFile: createSyntheticFile("mask.png", { type: "image/png" }),
  annotationName: "mask-label.png",
  annotationFile: createSyntheticFile("mask-label.png", { type: "image/png" }),
  status,
  validation: { valid: status === "matched", reasons: [] },
  segmentation: {
    sourceImageDimensions: status === "matched" ? { width: 80, height: 60 } : null,
    annotationDimensions: status === "matched" ? { width: 80, height: 60 } : null
  }
});

const createFakeContext = () => {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    clearRect: vi.fn(),
    font: "",
    textBaseline: "alphabetic",
    lineWidth: 0,
    strokeStyle: "",
    fillStyle: "",
    globalAlpha: 1
  } as unknown as CanvasRenderingContext2D;
};

describe("runtime review overlay primitives", () => {
  it("normalizes detection overlays safely and falls back to numeric labels", () => {
    const primitives = normalizeDetectionOverlayPrimitives(createDetectionRecord());

    expect(primitives).toHaveLength(2);
    expect(primitives[0]).toMatchObject({
      classId: 2,
      label: "2"
    });
    expect(primitives[1]).toMatchObject({
      classId: 4,
      label: "car"
    });
  });

  it("fails closed when malformed detection input reaches draw helpers", () => {
    const ctx = createFakeContext();
    const transform = computeStandardTransform({
      imageW: 100,
      imageH: 50,
      viewport: { scale: 1, cx: 0.5, cy: 0.5 },
      scale: 1,
      angleDeg: 30,
      canvasW: 100,
      canvasH: 50
    });

    const rendered = drawDetectionOverlayPrimitives(ctx, {
      primitives: [],
      imageDimensions: { width: 100, height: 50 },
      transform
    });

    expect(rendered).toBe(0);
    expect(ctx.rect).not.toHaveBeenCalled();
    expect(() => drawDetectionOverlayPrimitives(null, {
      primitives: normalizeDetectionOverlayPrimitives(undefined),
      imageDimensions: null,
      transform: null
    })).not.toThrow();
  });

  it("accepts only matched segmentation records and clamps overlay opacity", () => {
    expect(canRenderSegmentationOverlay(createSegmentationRecord("matched"))).toBe(true);
    expect(canRenderSegmentationOverlay(createSegmentationRecord("invalid"))).toBe(false);
    expect(clampReviewMaskOpacity(-1)).toBe(0);
    expect(clampReviewMaskOpacity(99)).toBe(1);
    expect(clampReviewMaskOpacity(Number.NaN)).toBe(0.5);
  });

  it("draws segmentation overlays with clamped opacity without throwing", () => {
    const ctx = createFakeContext();
    const transform = computeStandardTransform({
      imageW: 80,
      imageH: 60,
      viewport: { scale: 2, cx: 0.5, cy: 0.5 },
      scale: 2,
      angleDeg: 15,
      canvasW: 160,
      canvasH: 120
    });

    const drawn = drawSegmentationOverlay(ctx, {
      maskSource: { width: 80, height: 60 } as CanvasImageSource,
      imageDimensions: { width: 80, height: 60 },
      transform,
      opacity: 7
    });

    expect(drawn).toBe(true);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(ctx.globalAlpha).toBe(1);
  });
});
