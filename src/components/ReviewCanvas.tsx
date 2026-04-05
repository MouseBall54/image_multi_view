import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { ImageCanvas, type ImageCanvasHandle } from "./ImageCanvas";
import { useStore } from "../store";
import type { DrawableImage, ReviewType } from "../types";
import { UTIF_OPTIONS } from "../config";
import { decodeTiffWithUTIF } from "../utils/utif";
import type { ReviewDatasetRecord } from "../utils/reviewDataset";
import { getReviewMaskOpacityState } from "../utils/reviewDetail";
import {
  canRenderSegmentationOverlay,
  clampReviewMaskOpacity,
  DEFAULT_REVIEW_OVERLAY_PALETTE,
  drawDetectionOverlayPrimitives,
  drawSegmentationOverlay,
  filterDetectionOverlayPrimitives,
  normalizeDetectionOverlayPrimitives,
  type ReviewOverlayPalette
} from "../utils/reviewOverlay";
import { computeStandardTransform } from "../utils/viewTransforms";

const REVIEW_CANVAS_SLOT = 0;
const DEFAULT_MASK_RGB = { r: 0, g: 123, b: 255 };

export type ReviewCanvasProps = {
  record?: ReviewDatasetRecord | null;
  reviewType?: ReviewType;
  label?: string;
  visibleClassIds?: number[];
};

const isTiffFile = (filename: string): boolean => {
  const lower = filename.toLowerCase();
  return lower.endsWith(".tif") || lower.endsWith(".tiff");
};

const resolveReviewPalette = (element: HTMLElement | null): ReviewOverlayPalette => {
  if (!element || typeof window === "undefined") {
    return DEFAULT_REVIEW_OVERLAY_PALETTE;
  }

  const computed = window.getComputedStyle(element);
  return {
    detectionStroke: computed.getPropertyValue("--review-overlay-stroke").trim() || DEFAULT_REVIEW_OVERLAY_PALETTE.detectionStroke,
    detectionFill: computed.getPropertyValue("--review-overlay-fill").trim() || DEFAULT_REVIEW_OVERLAY_PALETTE.detectionFill,
    labelBackground: computed.getPropertyValue("--review-overlay-label-bg").trim() || DEFAULT_REVIEW_OVERLAY_PALETTE.labelBackground,
    labelText: computed.getPropertyValue("--review-overlay-label-text").trim() || DEFAULT_REVIEW_OVERLAY_PALETTE.labelText
  };
};

const loadCanvasImageSource = async (file: File): Promise<ImageBitmap | null> => {
  try {
    if (isTiffFile(file.name) && typeof document !== "undefined") {
      const decoded = await decodeTiffWithUTIF(file, UTIF_OPTIONS);
      if (typeof createImageBitmap === "function") {
        return await createImageBitmap(decoded);
      }
      return null;
    }

    if (typeof createImageBitmap === "function") {
      return await createImageBitmap(file);
    }
  } catch {
    return null;
  }

  return null;
};

const createMaskSourceCanvas = async (source: CanvasImageSource): Promise<HTMLCanvasElement | null> => {
  if (typeof document === "undefined") {
    return null;
  }

  const width = (source as { width?: number }).width ?? 0;
  const height = (source as { height?: number }).height ?? 0;
  if (!width || !height) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  return canvas;
};

const createTintedMaskCanvas = async (
  source: CanvasImageSource,
  visibleClassIds: number[] | null | undefined
): Promise<HTMLCanvasElement | null> => {
  if (typeof document === "undefined") {
    return null;
  }

  const width = (source as { width?: number }).width ?? 0;
  const height = (source as { height?: number }).height ?? 0;
  if (!width || !height) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return null;
  }

  const visibleClassIdSet = visibleClassIds && visibleClassIds.length > 0
    ? new Set(visibleClassIds)
    : null;

  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const alpha = data[index + 3] ?? 0;
    const intensity = Math.max(alpha, red, green, blue);

    if (intensity <= 0) {
      data[index + 3] = 0;
      continue;
    }

    const classId = green;
    if (classId <= 0 || (visibleClassIdSet && !visibleClassIdSet.has(classId))) {
      data[index + 3] = 0;
      continue;
    }

    data[index] = DEFAULT_MASK_RGB.r;
    data[index + 1] = DEFAULT_MASK_RGB.g;
    data[index + 2] = DEFAULT_MASK_RGB.b;
    data[index + 3] = intensity;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

export const ReviewCanvas = ({
  record = null,
  reviewType,
  label,
  visibleClassIds
}: ReviewCanvasProps) => {
  const imageCanvasRef = useRef<ImageCanvasHandle>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitmapCacheRef = useRef<Map<string, DrawableImage>>(new Map());
  const filteredCacheRef = useRef<Map<string, DrawableImage>>(new Map());
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const [maskSourceCanvas, setMaskSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [maskOverlaySource, setMaskOverlaySource] = useState<HTMLCanvasElement | null>(null);
  const [overlayCanvasSize, setOverlayCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const storeReviewType = useStore((state) => state.reviewType);
  const reviewOverlayVisible = useStore((state) => state.reviewOverlayVisible);
  const reviewMaskOpacity = useStore((state) => state.reviewMaskOpacity);
  const viewport = useStore((state) => state.viewport);
  const compareRotation = useStore((state) => state.compareRotation);
  const canvasImageDimensions = useStore((state) => state.analysisImageSizes[REVIEW_CANVAS_SLOT] ?? null);
  const setReviewOverlayVisible = useStore((state) => state.setReviewOverlayVisible);
  const setReviewMaskOpacity = useStore((state) => state.setReviewMaskOpacity);

  const resolvedReviewType = reviewType ?? storeReviewType;
  const imageDimensions = useMemo(() => {
    if (resolvedReviewType === "segmentation") {
      return record?.segmentation?.sourceImageDimensions ?? canvasImageDimensions;
    }

    return canvasImageDimensions;
  }, [canvasImageDimensions, record?.segmentation?.sourceImageDimensions, resolvedReviewType]);

  const detectionPrimitives = useMemo(() => normalizeDetectionOverlayPrimitives(record), [record]);
  const visibleDetectionPrimitives = useMemo(() => {
    return filterDetectionOverlayPrimitives(detectionPrimitives, visibleClassIds);
  }, [detectionPrimitives, visibleClassIds]);
  const displayLabel = label ?? record?.basename ?? "Review";
  const handleReviewMaskOpacityInput = (event: ChangeEvent<HTMLInputElement>) => {
    setReviewMaskOpacity(Number(event.target.value));
  };
  const maskOpacityState = useMemo(() => {
    return getReviewMaskOpacityState({
      reviewType: resolvedReviewType,
      record,
      hasMaskOverlaySource: Boolean(maskOverlaySource)
    });
  }, [maskOverlaySource, record, resolvedReviewType]);
  const showInteractiveMaskOpacity = resolvedReviewType === "segmentation" && !maskOpacityState.disabled;
  const maskOpacityStaticLabel = resolvedReviewType === "detection" ? "Segmentation only" : "Unavailable";

  useLayoutEffect(() => {
    const syncOverlayHost = () => {
      const canvas = imageCanvasRef.current?.getCanvas();
      const parentElement = canvas?.parentElement ?? null;
      setOverlayHost(parentElement);

      const bounds = canvas?.getBoundingClientRect();
      const nextWidth = Math.round(bounds?.width ?? 0);
      const nextHeight = Math.round(bounds?.height ?? 0);
      setOverlayCanvasSize({ width: nextWidth, height: nextHeight });

      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = nextWidth;
        overlayCanvasRef.current.height = nextHeight;
      }
    };

    syncOverlayHost();

    const canvas = imageCanvasRef.current?.getCanvas();
    if (!canvas) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      syncOverlayHost();
    });

    resizeObserver.observe(canvas);
    window.addEventListener("resize", syncOverlayHost);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncOverlayHost);
    };
  }, [record?.sourceImageFile]);

  useEffect(() => {
    let cancelled = false;

    const loadSegmentationOverlay = async () => {
      if (resolvedReviewType !== "segmentation" || !canRenderSegmentationOverlay(record) || !record?.annotationFile) {
        setMaskSourceCanvas(null);
        setMaskOverlaySource(null);
        return;
      }

      const maskBitmap = await loadCanvasImageSource(record.annotationFile);
      if (!maskBitmap || cancelled) {
        if (!cancelled) {
          setMaskSourceCanvas(null);
          setMaskOverlaySource(null);
        }
        return;
      }

      const rawMaskCanvas = await createMaskSourceCanvas(maskBitmap);
      if (!cancelled) {
        setMaskSourceCanvas(rawMaskCanvas);
      }

      if (typeof maskBitmap.close === "function") {
        maskBitmap.close();
      }
    };

    loadSegmentationOverlay();

    return () => {
      cancelled = true;
    };
  }, [record, resolvedReviewType]);

  useEffect(() => {
    let cancelled = false;

    const buildVisibleMaskOverlay = async () => {
      if (!maskSourceCanvas) {
        setMaskOverlaySource(null);
        return;
      }

      const tintedCanvas = await createTintedMaskCanvas(maskSourceCanvas, visibleClassIds);
      if (!cancelled) {
        setMaskOverlaySource(tintedCanvas);
      }
    };

    buildVisibleMaskOverlay();

    return () => {
      cancelled = true;
    };
  }, [maskSourceCanvas, visibleClassIds]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!reviewOverlayVisible || !imageDimensions || overlayCanvasSize.width <= 0 || overlayCanvasSize.height <= 0) {
      return;
    }

    const transform = computeStandardTransform({
      imageW: imageDimensions.width,
      imageH: imageDimensions.height,
      viewport,
      scale: viewport.scale,
      angleDeg: compareRotation || 0,
      canvasW: overlayCanvasSize.width,
      canvasH: overlayCanvasSize.height
    });

    const palette = resolveReviewPalette(overlayHost);

    if (resolvedReviewType === "detection") {
      drawDetectionOverlayPrimitives(ctx, {
        primitives: visibleDetectionPrimitives,
        imageDimensions,
        transform,
        palette
      });
      return;
    }

    if (resolvedReviewType === "segmentation" && maskOverlaySource) {
      drawSegmentationOverlay(ctx, {
        maskSource: maskOverlaySource,
        imageDimensions,
        transform,
        opacity: clampReviewMaskOpacity(reviewMaskOpacity)
      });
    }
  }, [
    compareRotation,
    imageDimensions,
    maskOverlaySource,
    overlayCanvasSize.height,
    overlayCanvasSize.width,
    overlayHost,
    resolvedReviewType,
    reviewMaskOpacity,
    reviewOverlayVisible,
    visibleDetectionPrimitives,
    viewport
  ]);

  return (
    <section className="review-canvas-shell" data-testid="review-canvas">
      <div className="controls-main review-canvas-controls">
        <label className="review-canvas-control-group">
          <span>Overlay</span>
          <button
            type="button"
            className={`controls-main-button ${reviewOverlayVisible ? "active" : ""}`}
            onClick={() => setReviewOverlayVisible(!reviewOverlayVisible)}
            data-testid="review-overlay-toggle"
            aria-pressed={reviewOverlayVisible}
          >
            {reviewOverlayVisible ? "Visible" : "Hidden"}
          </button>
        </label>
        <label className="review-canvas-control-group review-mask-opacity-group">
          <span>Mask Opacity</span>
          {showInteractiveMaskOpacity ? (
            <div className="review-mask-opacity-field">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={reviewMaskOpacity}
                onInput={handleReviewMaskOpacityInput}
                onChange={handleReviewMaskOpacityInput}
                data-testid="review-mask-opacity"
              />
              <output>{Math.round(clampReviewMaskOpacity(reviewMaskOpacity) * 100)}%</output>
            </div>
          ) : (
            <div className="review-mask-opacity-static" data-testid="review-mask-opacity-static">
              <span>{maskOpacityStaticLabel}</span>
            </div>
          )}
        </label>
      </div>

      <p className="review-mask-opacity-copy">{maskOpacityState.message}</p>

      <div className="review-canvas-stage">
        <ImageCanvas
          ref={imageCanvasRef}
          file={record?.sourceImageFile ?? undefined}
          label={displayLabel}
          cache={bitmapCacheRef.current}
          filteredCache={filteredCacheRef.current}
          appMode="compare"
          folderKey={REVIEW_CANVAS_SLOT}
        />
        {overlayHost && createPortal(
          <canvas
            ref={overlayCanvasRef}
            className="review-overlay-canvas"
            width={overlayCanvasSize.width}
            height={overlayCanvasSize.height}
            aria-hidden="true"
          />,
          overlayHost
        )}
      </div>
    </section>
  );
};
