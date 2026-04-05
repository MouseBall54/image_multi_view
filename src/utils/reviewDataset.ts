import type { ReviewFileStatusFilter, ReviewType } from "../types";
import { UTIF_OPTIONS } from "../config";
import { isImageFile } from "./folder";
import { naturalSort } from "./naturalSort";
import { decodeTiffWithUTIF } from "./utif";

export type ReviewValidationReasonCode =
  | "missing_image"
  | "missing_annotation"
  | "yolo_empty"
  | "yolo_row_column_count"
  | "yolo_non_numeric"
  | "yolo_class_id_invalid"
  | "yolo_value_out_of_range"
  | "segmentation_decode_failed"
  | "segmentation_dimension_mismatch";

export type ReviewValidationReason = {
  code: ReviewValidationReasonCode;
  message: string;
  line?: number;
  side?: "image" | "annotation";
  values?: number[];
};

export type ReviewValidationDetail = {
  valid: boolean;
  reasons: ReviewValidationReason[];
};

export type DetectionObject = {
  classId: number;
  className: string;
  x: number;
  y: number;
  width: number;
  height: number;
  line: number;
};

export type ImageDimensions = {
  width: number;
  height: number;
};

export type ReviewClassCatalogEntry = {
  id: number;
  label: string;
  recordCount: number;
  hasMetadata: boolean;
};

export type ReviewSegmentationSidecarState = {
  activeClassId: number | null;
  hiddenClassIds: number[];
  overlayOpacity: number | null;
};

export type ReviewSegmentationMaskAnalysis = {
  dimensions: ImageDimensions | null;
  classIds: number[];
};

export type ReviewDatasetRecord = {
  basename: string;
  sourceImageName: string | null;
  sourceImageFile: File | null;
  annotationName: string | null;
  annotationFile: File | null;
  status: ReviewFileStatusFilter;
  validation: ReviewValidationDetail;
  classIds: number[];
  detection?: {
    objects: DetectionObject[];
  };
  segmentation?: {
    sourceImageDimensions: ImageDimensions | null;
    annotationDimensions: ImageDimensions | null;
    sidecarState: ReviewSegmentationSidecarState | null;
  };
};

export type ReviewDatasetSummary = {
  matched: number;
  unmatched: number;
  invalid: number;
};

export type ReviewDatasetResult = {
  mode: ReviewType;
  records: ReviewDatasetRecord[];
  summary: ReviewDatasetSummary;
  classes: string[];
  hasClassesMetadata: boolean;
  classCatalog: ReviewClassCatalogEntry[];
};

type BasenameEntry = {
  basename: string;
  filename: string;
  file: File;
};

type DetectionClassMetadata = {
  classNamesById: Map<number, string>;
  classes: string[];
  hasClassesMetadata: boolean;
};

export type ImageDimensionResolver = (file: File) => Promise<ImageDimensions | null>;
export type SegmentationMaskAnalysisResolver = (file: File) => Promise<ReviewSegmentationMaskAnalysis>;
export type SegmentationSidecarResolver = (file: File) => Promise<ReviewSegmentationSidecarState | null>;

export type BuildReviewDatasetInput = {
  mode: ReviewType;
  imageFiles: Map<string, File>;
  annotationFiles: Map<string, File>;
  resolveImageDimensions?: ImageDimensionResolver;
  resolveSegmentationMask?: SegmentationMaskAnalysisResolver;
  resolveSegmentationSidecar?: SegmentationSidecarResolver;
};

const DETECTION_METADATA_FILENAMES = new Set(["classes.txt", "classes.yaml", "classes.yml"]);
const SEGMENTATION_SIDECAR_PATTERN = /\.seg\.json$/i;

const stripExtension = (filename: string): string => filename.replace(/\.[^/.]+$/, "");

const stripSegmentationSidecarSuffix = (filename: string): string => {
  return filename.replace(SEGMENTATION_SIDECAR_PATTERN, "");
};

const isDetectionMetadataFile = (filename: string): boolean => {
  return DETECTION_METADATA_FILENAMES.has(filename.toLowerCase());
};

const isDetectionAnnotationFile = (filename: string): boolean => {
  return filename.toLowerCase().endsWith(".txt") && !isDetectionMetadataFile(filename);
};

const isSegmentationSidecarFile = (filename: string): boolean => {
  return SEGMENTATION_SIDECAR_PATTERN.test(filename);
};

const getSortedImageEntries = (files: Map<string, File>): BasenameEntry[] => {
  return Array.from(files.entries())
    .filter(([filename]) => isImageFile(filename))
    .map(([filename, file]) => ({ basename: stripExtension(filename), filename, file }))
    .sort((a, b) => naturalSort(a.filename, b.filename));
};

const indexFirstByBasename = (entries: BasenameEntry[]): Map<string, BasenameEntry> => {
  const indexed = new Map<string, BasenameEntry>();
  for (const entry of entries) {
    if (!indexed.has(entry.basename)) {
      indexed.set(entry.basename, entry);
    }
  }
  return indexed;
};

const buildSummary = (records: ReviewDatasetRecord[]): ReviewDatasetSummary => {
  const summary: ReviewDatasetSummary = { matched: 0, unmatched: 0, invalid: 0 };
  for (const record of records) {
    summary[record.status] += 1;
  }
  return summary;
};

const getSortedBasenames = (first: Iterable<string>, second: Iterable<string>): string[] => {
  const union = new Set<string>();
  for (const name of first) {
    union.add(name);
  }
  for (const name of second) {
    union.add(name);
  }
  return Array.from(union).sort((a, b) => naturalSort(a, b));
};

const cleanMetadataLabel = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const parseYamlClassMetadata = (text: string): Map<number, string> => {
  const classNamesById = new Map<number, string>();
  const lines = text.split(/\r?\n/);
  let inNamesBlock = false;
  let nextListIndex = 0;

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) {
      continue;
    }

    const trimmed = rawLine.trim();

    if (/^names\s*:/i.test(trimmed)) {
      inNamesBlock = true;
      nextListIndex = 0;

      const inlineValue = trimmed.replace(/^names\s*:/i, "").trim();
      if (inlineValue.length > 0) {
        const match = inlineValue.match(/^\[(.*)\]$/);
        if (match?.[1]) {
          match[1]
            .split(",")
            .map((value) => cleanMetadataLabel(value))
            .filter((value) => value.length > 0)
            .forEach((label, index) => {
              classNamesById.set(index, label);
            });
        }
      }
      continue;
    }

    const topLevelMapping = trimmed.match(/^(\d+)\s*:\s*(.+)$/);
    if (topLevelMapping) {
      classNamesById.set(Number(topLevelMapping[1]), cleanMetadataLabel(topLevelMapping[2]));
      continue;
    }

    if (!inNamesBlock) {
      continue;
    }

    if (!rawLine.startsWith(" ") && !rawLine.startsWith("\t")) {
      inNamesBlock = false;
      continue;
    }

    const listItem = trimmed.match(/^-\s*(.+)$/);
    if (listItem) {
      classNamesById.set(nextListIndex, cleanMetadataLabel(listItem[1]));
      nextListIndex += 1;
      continue;
    }

    const nestedMapping = trimmed.match(/^(\d+)\s*:\s*(.+)$/);
    if (nestedMapping) {
      classNamesById.set(Number(nestedMapping[1]), cleanMetadataLabel(nestedMapping[2]));
    }
  }

  return classNamesById;
};

const parseClassesMetadata = async (
  annotationFiles: Map<string, File>
): Promise<DetectionClassMetadata> => {
  const classesTextFile = annotationFiles.get("classes.txt");
  if (classesTextFile) {
    try {
      const text = await classesTextFile.text();
      const classNamesById = new Map<number, string>();
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .forEach((label, index) => {
          classNamesById.set(index, label);
        });

      return {
        classNamesById,
        classes: Array.from(classNamesById.values()),
        hasClassesMetadata: true
      };
    } catch {
      return { classNamesById: new Map(), classes: [], hasClassesMetadata: true };
    }
  }

  const yamlMetadataFile = annotationFiles.get("classes.yaml") ?? annotationFiles.get("classes.yml");
  if (!yamlMetadataFile) {
    return { classNamesById: new Map(), classes: [], hasClassesMetadata: false };
  }

  try {
    const text = await yamlMetadataFile.text();
    const classNamesById = parseYamlClassMetadata(text);
    const classes = Array.from(classNamesById.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([, label]) => label);

    return {
      classNamesById,
      classes,
      hasClassesMetadata: true
    };
  } catch {
    return { classNamesById: new Map(), classes: [], hasClassesMetadata: true };
  }
};

const toDetectionClassName = (classId: number, classNamesById: Map<number, string>): string => {
  const className = classNamesById.get(classId);
  if (!className) {
    return String(classId);
  }
  return className;
};

type ParsedYoloResult = {
  objects: DetectionObject[];
  validation: ReviewValidationDetail;
};

const parseYoloLabelFile = async (
  file: File,
  classNamesById: Map<number, string>
): Promise<ParsedYoloResult> => {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      objects: [],
      validation: {
        valid: false,
        reasons: [{ code: "yolo_empty", message: "Label file is empty." }]
      }
    };
  }

  const objects: DetectionObject[] = [];
  const reasons: ReviewValidationReason[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const tokens = line.split(/\s+/).filter((token) => token.length > 0);
    if (tokens.length !== 5) {
      reasons.push({
        code: "yolo_row_column_count",
        message: "YOLO row must contain exactly 5 columns.",
        line: lineNumber
      });
      return;
    }

    const numeric = tokens.map((token) => Number(token));
    if (numeric.some((value) => Number.isNaN(value))) {
      reasons.push({
        code: "yolo_non_numeric",
        message: "YOLO row contains non-numeric tokens.",
        line: lineNumber
      });
      return;
    }

    const classId = numeric[0] ?? Number.NaN;
    const x = numeric[1] ?? Number.NaN;
    const y = numeric[2] ?? Number.NaN;
    const width = numeric[3] ?? Number.NaN;
    const height = numeric[4] ?? Number.NaN;

    if (!Number.isInteger(classId) || classId < 0) {
      reasons.push({
        code: "yolo_class_id_invalid",
        message: "YOLO class id must be a non-negative integer.",
        line: lineNumber,
        values: [classId]
      });
      return;
    }

    const normalized = [x, y, width, height];
    const outOfRange = normalized.some((value) => value < 0 || value > 1);
    if (outOfRange) {
      reasons.push({
        code: "yolo_value_out_of_range",
        message: "YOLO normalized values must be within [0, 1].",
        line: lineNumber,
        values: normalized
      });
      return;
    }

    objects.push({
      classId,
      className: toDetectionClassName(classId, classNamesById),
      x,
      y,
      width,
      height,
      line: lineNumber
    });
  });

  return {
    objects,
    validation: {
      valid: reasons.length === 0,
      reasons
    }
  };
};

const isTiffFile = (filename: string): boolean => {
  const lower = filename.toLowerCase();
  return lower.endsWith(".tif") || lower.endsWith(".tiff");
};

export const defaultImageDimensionResolver: ImageDimensionResolver = async (file) => {
  try {
    if (isTiffFile(file.name) && typeof document !== "undefined") {
      const tiffImage = await decodeTiffWithUTIF(file, UTIF_OPTIONS);
      return { width: tiffImage.width, height: tiffImage.height };
    }

    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      return { width: bitmap.width, height: bitmap.height };
    }
  } catch {
    return null;
  }

  return null;
};

const extractSegmentationClassIdsFromPixels = (
  pixels: Uint8ClampedArray
): number[] => {
  const classIds = new Set<number>();

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0;
    if (alpha <= 0) {
      continue;
    }

    const classId = pixels[index + 1] ?? 0;
    if (classId > 0) {
      classIds.add(classId);
    }
  }

  return Array.from(classIds).sort((left, right) => left - right);
};

const readImageDataFromSource = (
  source: CanvasImageSource,
  width: number,
  height: number
): ImageData | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  try {
    return context.getImageData(0, 0, width, height);
  } catch {
    return null;
  }
};

export const defaultSegmentationMaskAnalysisResolver: SegmentationMaskAnalysisResolver = async (file) => {
  try {
    if (isTiffFile(file.name) && typeof document !== "undefined") {
      const tiffImage = await decodeTiffWithUTIF(file, UTIF_OPTIONS);
      const imageData = readImageDataFromSource(tiffImage, tiffImage.width, tiffImage.height);
      return {
        dimensions: { width: tiffImage.width, height: tiffImage.height },
        classIds: imageData ? extractSegmentationClassIdsFromPixels(imageData.data) : []
      };
    }

    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const imageData = readImageDataFromSource(bitmap, bitmap.width, bitmap.height);
      if (typeof bitmap.close === "function") {
        bitmap.close();
      }

      return {
        dimensions: { width: bitmap.width, height: bitmap.height },
        classIds: imageData ? extractSegmentationClassIdsFromPixels(imageData.data) : []
      };
    }
  } catch {
    return { dimensions: null, classIds: [] };
  }

  return { dimensions: null, classIds: [] };
};

const toOptionalNonNegativeInteger = (value: unknown): number | null => {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(numeric) || (numeric as number) < 0) {
    return null;
  }
  return numeric as number;
};

export const defaultSegmentationSidecarResolver: SegmentationSidecarResolver = async (file) => {
  try {
    const payload = JSON.parse(await file.text()) as {
      activeClassId?: unknown;
      hiddenClassIds?: unknown;
      overlayOpacity?: unknown;
    };

    const hiddenClassIds = Array.isArray(payload.hiddenClassIds)
      ? Array.from(new Set(
        payload.hiddenClassIds
          .map((value) => toOptionalNonNegativeInteger(value))
          .filter((value): value is number => value !== null)
      )).sort((left, right) => left - right)
      : [];

    const overlayOpacity = typeof payload.overlayOpacity === "number" && Number.isFinite(payload.overlayOpacity)
      ? payload.overlayOpacity
      : null;

    return {
      activeClassId: toOptionalNonNegativeInteger(payload.activeClassId),
      hiddenClassIds,
      overlayOpacity
    };
  } catch {
    return null;
  }
};

const toSortedUniqueClassIds = (classIds: Iterable<number>): number[] => {
  return Array.from(
    new Set(
      Array.from(classIds).filter((classId) => Number.isInteger(classId) && classId >= 0)
    )
  ).sort((left, right) => left - right);
};

const buildClassCatalog = (
  records: ReviewDatasetRecord[],
  resolveLabel: (classId: number) => string,
  metadataClassIds: Iterable<number> = []
): ReviewClassCatalogEntry[] => {
  const metadataIds = new Set<number>(metadataClassIds);
  const recordCountById = new Map<number, number>();

  for (const record of records) {
    const uniqueRecordClassIds = new Set(record.classIds);
    uniqueRecordClassIds.forEach((classId) => {
      recordCountById.set(classId, (recordCountById.get(classId) ?? 0) + 1);
    });
  }

  const allClassIds = new Set<number>(metadataIds);
  recordCountById.forEach((_, classId) => {
    allClassIds.add(classId);
  });

  return Array.from(allClassIds)
    .sort((left, right) => left - right)
    .map((classId) => ({
      id: classId,
      label: resolveLabel(classId),
      recordCount: recordCountById.get(classId) ?? 0,
      hasMetadata: metadataIds.has(classId)
    }));
};

const buildUnmatchedRecord = (params: {
  basename: string;
  imageEntry: BasenameEntry | undefined;
  annotationEntry: BasenameEntry | undefined;
  reasonCode: "missing_image" | "missing_annotation";
}): ReviewDatasetRecord => {
  return {
    basename: params.basename,
    sourceImageName: params.imageEntry?.filename ?? null,
    sourceImageFile: params.imageEntry?.file ?? null,
    annotationName: params.annotationEntry?.filename ?? null,
    annotationFile: params.annotationEntry?.file ?? null,
    status: "unmatched",
    validation: {
      valid: false,
      reasons: [
        {
          code: params.reasonCode,
          message: params.reasonCode === "missing_annotation"
            ? "Annotation file is missing for this image."
            : "Image file is missing for this annotation."
        }
      ]
    },
    classIds: []
  };
};

const buildDetectionReviewDataset = async (input: BuildReviewDatasetInput): Promise<ReviewDatasetResult> => {
  const imageEntries = getSortedImageEntries(input.imageFiles);
  const imageByBasename = indexFirstByBasename(imageEntries);

  const detectionAnnotationEntries = Array.from(input.annotationFiles.entries())
    .filter(([filename]) => isDetectionAnnotationFile(filename))
    .map(([filename, file]) => ({ basename: stripExtension(filename), filename, file }))
    .sort((a, b) => naturalSort(a.filename, b.filename));
  const annotationByBasename = indexFirstByBasename(detectionAnnotationEntries);

  const { classNamesById, classes, hasClassesMetadata } = await parseClassesMetadata(input.annotationFiles);
  const basenames = getSortedBasenames(imageByBasename.keys(), annotationByBasename.keys());
  const records: ReviewDatasetRecord[] = [];

  for (const basename of basenames) {
    const imageEntry = imageByBasename.get(basename);
    const annotationEntry = annotationByBasename.get(basename);

    if (!annotationEntry) {
      records.push(buildUnmatchedRecord({ basename, imageEntry, annotationEntry, reasonCode: "missing_annotation" }));
      continue;
    }

    if (!imageEntry) {
      records.push(buildUnmatchedRecord({ basename, imageEntry, annotationEntry, reasonCode: "missing_image" }));
      continue;
    }

    const parsed = await parseYoloLabelFile(annotationEntry.file, classNamesById);
    records.push({
      basename,
      sourceImageName: imageEntry.filename,
      sourceImageFile: imageEntry.file,
      annotationName: annotationEntry.filename,
      annotationFile: annotationEntry.file,
      status: parsed.validation.valid ? "matched" : "invalid",
      validation: parsed.validation,
      classIds: toSortedUniqueClassIds(parsed.objects.map((object) => object.classId)),
      detection: {
        objects: parsed.objects
      }
    });
  }

  const classCatalog = buildClassCatalog(
    records,
    (classId) => toDetectionClassName(classId, classNamesById),
    classNamesById.keys()
  );

  return {
    mode: "detection",
    records,
    summary: buildSummary(records),
    classes,
    hasClassesMetadata,
    classCatalog
  };
};

const buildSegmentationReviewDataset = async (input: BuildReviewDatasetInput): Promise<ReviewDatasetResult> => {
  const resolveImageDimensions = input.resolveImageDimensions ?? defaultImageDimensionResolver;
  const resolveSegmentationMask = input.resolveSegmentationMask ?? defaultSegmentationMaskAnalysisResolver;
  const resolveSegmentationSidecar = input.resolveSegmentationSidecar ?? defaultSegmentationSidecarResolver;

  const imageEntries = getSortedImageEntries(input.imageFiles);
  const maskEntries = getSortedImageEntries(input.annotationFiles);
  const sidecarByBasename = new Map<string, File>(
    Array.from(input.annotationFiles.entries())
      .filter(([filename]) => isSegmentationSidecarFile(filename))
      .map(([filename, file]) => [stripSegmentationSidecarSuffix(filename), file] as [string, File])
  );

  const imageByBasename = indexFirstByBasename(imageEntries);
  const maskByBasename = indexFirstByBasename(maskEntries);
  const basenames = getSortedBasenames(imageByBasename.keys(), maskByBasename.keys());
  const records: ReviewDatasetRecord[] = [];

  for (const basename of basenames) {
    const imageEntry = imageByBasename.get(basename);
    const annotationEntry = maskByBasename.get(basename);

    if (!annotationEntry) {
      records.push(buildUnmatchedRecord({ basename, imageEntry, annotationEntry, reasonCode: "missing_annotation" }));
      continue;
    }

    if (!imageEntry) {
      records.push(buildUnmatchedRecord({ basename, imageEntry, annotationEntry, reasonCode: "missing_image" }));
      continue;
    }

    const [sourceImageDimensions, annotationMask, sidecarState] = await Promise.all([
      resolveImageDimensions(imageEntry.file),
      resolveSegmentationMask(annotationEntry.file),
      sidecarByBasename.has(basename)
        ? resolveSegmentationSidecar(sidecarByBasename.get(basename) as File)
        : Promise.resolve(null)
    ]);

    if (!sourceImageDimensions) {
      records.push({
        basename,
        sourceImageName: imageEntry.filename,
        sourceImageFile: imageEntry.file,
        annotationName: annotationEntry.filename,
        annotationFile: annotationEntry.file,
        status: "invalid",
        validation: {
          valid: false,
          reasons: [{ code: "segmentation_decode_failed", side: "image", message: "Failed to decode source image dimensions." }]
        },
        classIds: annotationMask.classIds,
        segmentation: {
          sourceImageDimensions: null,
          annotationDimensions: annotationMask.dimensions,
          sidecarState
        }
      });
      continue;
    }

    if (!annotationMask.dimensions) {
      records.push({
        basename,
        sourceImageName: imageEntry.filename,
        sourceImageFile: imageEntry.file,
        annotationName: annotationEntry.filename,
        annotationFile: annotationEntry.file,
        status: "invalid",
        validation: {
          valid: false,
          reasons: [{ code: "segmentation_decode_failed", side: "annotation", message: "Failed to decode annotation mask dimensions." }]
        },
        classIds: annotationMask.classIds,
        segmentation: {
          sourceImageDimensions,
          annotationDimensions: null,
          sidecarState
        }
      });
      continue;
    }

    const sameSize = sourceImageDimensions.width === annotationMask.dimensions.width
      && sourceImageDimensions.height === annotationMask.dimensions.height;

    if (!sameSize) {
      records.push({
        basename,
        sourceImageName: imageEntry.filename,
        sourceImageFile: imageEntry.file,
        annotationName: annotationEntry.filename,
        annotationFile: annotationEntry.file,
        status: "invalid",
        validation: {
          valid: false,
          reasons: [{
            code: "segmentation_dimension_mismatch",
            message: "Mask dimensions do not match source image dimensions.",
            values: [
              sourceImageDimensions.width,
              sourceImageDimensions.height,
              annotationMask.dimensions.width,
              annotationMask.dimensions.height
            ]
          }]
        },
        classIds: annotationMask.classIds,
        segmentation: {
          sourceImageDimensions,
          annotationDimensions: annotationMask.dimensions,
          sidecarState
        }
      });
      continue;
    }

    records.push({
      basename,
      sourceImageName: imageEntry.filename,
      sourceImageFile: imageEntry.file,
      annotationName: annotationEntry.filename,
      annotationFile: annotationEntry.file,
      status: "matched",
      validation: {
        valid: true,
        reasons: []
      },
      classIds: annotationMask.classIds,
      segmentation: {
        sourceImageDimensions,
        annotationDimensions: annotationMask.dimensions,
        sidecarState
      }
    });
  }

  const classCatalog = buildClassCatalog(records, (classId) => String(classId));

  return {
    mode: "segmentation",
    records,
    summary: buildSummary(records),
    classes: classCatalog.map((entry) => entry.label),
    hasClassesMetadata: false,
    classCatalog
  };
};

export const buildReviewDataset = async (input: BuildReviewDatasetInput): Promise<ReviewDatasetResult> => {
  if (input.mode === "detection") {
    return buildDetectionReviewDataset(input);
  }
  return buildSegmentationReviewDataset(input);
};
