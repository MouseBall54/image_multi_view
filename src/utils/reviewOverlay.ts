import type { ImageDimensions, ReviewDatasetRecord } from "./reviewDataset";
import type { StandardTransform } from "./viewTransforms";

export type ReviewDetectionOverlayPrimitive = {
  classId: number;
  label: string;
  line: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ReviewOverlayPalette = {
  detectionStroke: string;
  detectionFill: string;
  labelBackground: string;
  labelText: string;
};

const DEFAULT_LABEL_FONT_SIZE = 13;

export const DEFAULT_REVIEW_OVERLAY_PALETTE: ReviewOverlayPalette = {
  detectionStroke: "rgba(0, 123, 255, 0.95)",
  detectionFill: "rgba(0, 123, 255, 0.16)",
  labelBackground: "rgba(0, 0, 0, 0.78)",
  labelText: "#f0f0f0"
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const clampUnit = (value: number): number => {
  return Math.max(0, Math.min(1, value));
};

const sanitizeLabel = (label: string | number | null | undefined, classId: number): string => {
  if (typeof label === "string") {
    const trimmed = label.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (typeof label === "number" && Number.isFinite(label)) {
    return String(label);
  }

  return String(classId);
};

const getLabelWidth = (ctx: CanvasRenderingContext2D, label: string, fontSize: number): number => {
  if (typeof ctx.measureText === "function") {
    return ctx.measureText(label).width;
  }

  return label.length * fontSize * 0.6;
};

export const clampReviewMaskOpacity = (opacity: number): number => {
  if (!Number.isFinite(opacity)) {
    return 0.5;
  }

  return clampUnit(opacity);
};

export const normalizeDetectionOverlayPrimitives = (
  record: ReviewDatasetRecord | null | undefined
): ReviewDetectionOverlayPrimitive[] => {
  const objects = record?.detection?.objects;
  if (!Array.isArray(objects) || objects.length === 0) {
    return [];
  }

  const primitives: ReviewDetectionOverlayPrimitive[] = [];

  for (const object of objects) {
    if (!object || !isFiniteNumber(object.classId)) {
      continue;
    }

    if (!isFiniteNumber(object.x) || !isFiniteNumber(object.y) || !isFiniteNumber(object.width) || !isFiniteNumber(object.height)) {
      continue;
    }

    if (object.width <= 0 || object.height <= 0) {
      continue;
    }

    const rawLeft = object.x - (object.width / 2);
    const rawTop = object.y - (object.height / 2);
    const rawRight = object.x + (object.width / 2);
    const rawBottom = object.y + (object.height / 2);

    if (rawRight <= 0 || rawBottom <= 0 || rawLeft >= 1 || rawTop >= 1) {
      continue;
    }

    const left = clampUnit(rawLeft);
    const top = clampUnit(rawTop);
    const right = clampUnit(rawRight);
    const bottom = clampUnit(rawBottom);
    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) {
      continue;
    }

    primitives.push({
      classId: object.classId,
      label: sanitizeLabel(object.className, object.classId),
      line: object.line,
      left,
      top,
      width,
      height
    });
  }

  return primitives;
};

export const canRenderSegmentationOverlay = (
  record: ReviewDatasetRecord | null | undefined
): boolean => {
  if (!record || record.status !== "matched") {
    return false;
  }

  if (!record.annotationFile || !record.sourceImageFile) {
    return false;
  }

  const sourceImageDimensions = record.segmentation?.sourceImageDimensions;
  const annotationDimensions = record.segmentation?.annotationDimensions;

  return Boolean(
    sourceImageDimensions &&
    annotationDimensions &&
    sourceImageDimensions.width > 0 &&
    sourceImageDimensions.height > 0 &&
    annotationDimensions.width > 0 &&
    annotationDimensions.height > 0
  );
};

export const drawDetectionOverlayPrimitives = (
  ctx: CanvasRenderingContext2D | null | undefined,
  params: {
    primitives: ReviewDetectionOverlayPrimitive[];
    imageDimensions: ImageDimensions | null | undefined;
    transform: StandardTransform | null | undefined;
    palette?: Partial<ReviewOverlayPalette>;
  }
): number => {
  if (!ctx || !params.transform || !params.imageDimensions) {
    return 0;
  }

  const { primitives, imageDimensions, transform } = params;
  if (!Array.isArray(primitives) || primitives.length === 0) {
    return 0;
  }

  const palette: ReviewOverlayPalette = {
    ...DEFAULT_REVIEW_OVERLAY_PALETTE,
    ...params.palette
  };

  const fontSize = DEFAULT_LABEL_FONT_SIZE;
  const lineWidth = Math.max(1.5, Math.min(3, transform.scale * 1.2));
  let renderedCount = 0;

  ctx.save();
  if (transform.theta !== 0) {
    ctx.translate(transform.centerX, transform.centerY);
    ctx.rotate(transform.theta);
    ctx.translate(-transform.centerX, -transform.centerY);
  }

  ctx.font = `600 ${fontSize}px "Noto Sans", sans-serif`;
  ctx.textBaseline = "top";
  ctx.lineWidth = lineWidth;

  for (const primitive of primitives) {
    const screenX = transform.drawX + (primitive.left * imageDimensions.width * transform.scale);
    const screenY = transform.drawY + (primitive.top * imageDimensions.height * transform.scale);
    const screenWidth = primitive.width * imageDimensions.width * transform.scale;
    const screenHeight = primitive.height * imageDimensions.height * transform.scale;

    if (!Number.isFinite(screenX) || !Number.isFinite(screenY) || !Number.isFinite(screenWidth) || !Number.isFinite(screenHeight)) {
      continue;
    }

    if (screenWidth <= 0 || screenHeight <= 0) {
      continue;
    }

    ctx.strokeStyle = palette.detectionStroke;
    ctx.fillStyle = palette.detectionFill;
    ctx.beginPath();
    ctx.rect(screenX, screenY, screenWidth, screenHeight);
    ctx.fill();
    ctx.stroke();

    const label = primitive.label;
    if (label.length > 0) {
      const labelWidth = getLabelWidth(ctx, label, fontSize);
      const labelHeight = fontSize + 8;
      const labelY = Math.max(0, screenY - labelHeight - 4);

      ctx.fillStyle = palette.labelBackground;
      ctx.fillRect(screenX, labelY, labelWidth + 12, labelHeight);

      ctx.fillStyle = palette.labelText;
      ctx.fillText(label, screenX + 6, labelY + 4);
    }

    renderedCount += 1;
  }

  ctx.restore();
  return renderedCount;
};

export const drawSegmentationOverlay = (
  ctx: CanvasRenderingContext2D | null | undefined,
  params: {
    maskSource: CanvasImageSource | null | undefined;
    imageDimensions: ImageDimensions | null | undefined;
    transform: StandardTransform | null | undefined;
    opacity: number;
  }
): boolean => {
  if (!ctx || !params.maskSource || !params.transform || !params.imageDimensions) {
    return false;
  }

  const { maskSource, imageDimensions, transform } = params;
  const opacity = clampReviewMaskOpacity(params.opacity);
  if (opacity <= 0) {
    return false;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  if (transform.theta !== 0) {
    ctx.translate(transform.centerX, transform.centerY);
    ctx.rotate(transform.theta);
    ctx.translate(-transform.centerX, -transform.centerY);
  }

  ctx.drawImage(
    maskSource,
    transform.drawX,
    transform.drawY,
    imageDimensions.width * transform.scale,
    imageDimensions.height * transform.scale
  );
  ctx.restore();
  return true;
};
