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

const DETECTION_CLASS_COLORS = [
  "#4f9dff",
  "#ff7a59",
  "#22c55e",
  "#eab308",
  "#a78bfa",
  "#06b6d4",
  "#f43f5e",
  "#84cc16",
  "#fb7185",
  "#14b8a6",
  "#f59e0b",
  "#60a5fa"
] as const;

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

const hexToRgb = (hexColor: string): { r: number; g: number; b: number } | null => {
  const normalized = hexColor.trim().replace("#", "");
  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
};

const toRgba = (rgb: { r: number; g: number; b: number }, alpha: number): string => {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`;
};

const getClassColor = (classId: number): { r: number; g: number; b: number } | null => {
  if (!Number.isFinite(classId)) {
    return null;
  }

  const safeIndex = ((Math.trunc(classId) % DETECTION_CLASS_COLORS.length) + DETECTION_CLASS_COLORS.length) % DETECTION_CLASS_COLORS.length;
  return hexToRgb(DETECTION_CLASS_COLORS[safeIndex]);
};

const getDetectionClassStyle = (classId: number, fallback: ReviewOverlayPalette): ReviewOverlayPalette => {
  const rgb = getClassColor(classId);
  if (!rgb) {
    return fallback;
  }

  const luminance = ((0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b)) / 255;

  return {
    detectionStroke: toRgba(rgb, 0.95),
    detectionFill: toRgba(rgb, 0.2),
    labelBackground: toRgba(rgb, 0.9),
    labelText: luminance > 0.62 ? "#111418" : "#f8fafc"
  };
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

  const canvasWidth = Number.isFinite(ctx.canvas?.width) && (ctx.canvas?.width ?? 0) > 0 ? (ctx.canvas?.width ?? 0) : Number.POSITIVE_INFINITY;
  const canvasHeight = Number.isFinite(ctx.canvas?.height) && (ctx.canvas?.height ?? 0) > 0 ? (ctx.canvas?.height ?? 0) : Number.POSITIVE_INFINITY;

  ctx.beginPath();
  ctx.rect(
    transform.drawX,
    transform.drawY,
    imageDimensions.width * transform.scale,
    imageDimensions.height * transform.scale
  );
  ctx.clip();

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

    const right = screenX + screenWidth;
    const bottom = screenY + screenHeight;
    const intersectsViewport = right > 0 && bottom > 0 && screenX < canvasWidth && screenY < canvasHeight;
    if (!intersectsViewport) {
      continue;
    }

    const classStyle = getDetectionClassStyle(primitive.classId, palette);

    ctx.strokeStyle = classStyle.detectionStroke;
    ctx.fillStyle = classStyle.detectionFill;
    ctx.beginPath();
    ctx.rect(screenX, screenY, screenWidth, screenHeight);
    ctx.fill();
    ctx.stroke();

    const label = primitive.label;
    if (label.length > 0) {
      const labelWidth = getLabelWidth(ctx, label, fontSize);
      const labelHeight = fontSize + 8;
      const labelBoxWidth = labelWidth + 12;
      const maxLabelX = Math.max(0, canvasWidth - labelBoxWidth);
      const maxLabelY = Math.max(0, canvasHeight - labelHeight);
      const labelX = Math.max(0, Math.min(screenX, maxLabelX));
      const labelY = Math.max(0, Math.min(screenY - labelHeight - 4, maxLabelY));

      ctx.fillStyle = classStyle.labelBackground;
      ctx.fillRect(labelX, labelY, labelBoxWidth, labelHeight);

      ctx.fillStyle = classStyle.labelText;
      ctx.fillText(label, labelX + 6, labelY + 4);
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
