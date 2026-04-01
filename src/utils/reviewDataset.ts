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

export type ReviewDatasetRecord = {
  basename: string;
  sourceImageName: string | null;
  sourceImageFile: File | null;
  annotationName: string | null;
  annotationFile: File | null;
  status: ReviewFileStatusFilter;
  validation: ReviewValidationDetail;
  detection?: {
    objects: DetectionObject[];
  };
  segmentation?: {
    sourceImageDimensions: ImageDimensions | null;
    annotationDimensions: ImageDimensions | null;
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
};

type BasenameEntry = {
  basename: string;
  filename: string;
  file: File;
};

export type ImageDimensionResolver = (file: File) => Promise<ImageDimensions | null>;

export type BuildReviewDatasetInput = {
  mode: ReviewType;
  imageFiles: Map<string, File>;
  annotationFiles: Map<string, File>;
  resolveImageDimensions?: ImageDimensionResolver;
};

const stripExtension = (filename: string): string => filename.replace(/\.[^/.]+$/, "");

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

const parseClassesMetadata = async (annotationFiles: Map<string, File>): Promise<{ classes: string[]; hasClassesMetadata: boolean }> => {
  const classesFile = annotationFiles.get("classes.txt");
  if (!classesFile) {
    return { classes: [], hasClassesMetadata: false };
  }

  try {
    const text = await classesFile.text();
    const classes = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return { classes, hasClassesMetadata: true };
  } catch {
    return { classes: [], hasClassesMetadata: true };
  }
};

const toDetectionClassName = (classId: number, classes: string[]): string => {
  const className = classes[classId];
  if (!className) {
    return String(classId);
  }
  return className;
};

type ParsedYoloResult = {
  objects: DetectionObject[];
  validation: ReviewValidationDetail;
};

const parseYoloLabelFile = async (file: File, classes: string[]): Promise<ParsedYoloResult> => {
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
      className: toDetectionClassName(classId, classes),
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
    }
  };
};

const buildDetectionReviewDataset = async (input: BuildReviewDatasetInput): Promise<ReviewDatasetResult> => {
  const imageEntries = getSortedImageEntries(input.imageFiles);
  const imageByBasename = indexFirstByBasename(imageEntries);

  const detectionAnnotationEntries = Array.from(input.annotationFiles.entries())
    .filter(([filename]) => filename.toLowerCase() !== "classes.txt")
    .filter(([filename]) => filename.toLowerCase().endsWith(".txt"))
    .map(([filename, file]) => ({ basename: stripExtension(filename), filename, file }))
    .sort((a, b) => naturalSort(a.filename, b.filename));
  const annotationByBasename = indexFirstByBasename(detectionAnnotationEntries);

  const { classes, hasClassesMetadata } = await parseClassesMetadata(input.annotationFiles);
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

    const parsed = await parseYoloLabelFile(annotationEntry.file, classes);
    records.push({
      basename,
      sourceImageName: imageEntry.filename,
      sourceImageFile: imageEntry.file,
      annotationName: annotationEntry.filename,
      annotationFile: annotationEntry.file,
      status: parsed.validation.valid ? "matched" : "invalid",
      validation: parsed.validation,
      detection: {
        objects: parsed.objects
      }
    });
  }

  return {
    mode: "detection",
    records,
    summary: buildSummary(records),
    classes,
    hasClassesMetadata
  };
};

const buildSegmentationReviewDataset = async (input: BuildReviewDatasetInput): Promise<ReviewDatasetResult> => {
  const resolveImageDimensions = input.resolveImageDimensions ?? defaultImageDimensionResolver;
  const imageEntries = getSortedImageEntries(input.imageFiles);
  const maskEntries = getSortedImageEntries(input.annotationFiles);

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

    const sourceImageDimensions = await resolveImageDimensions(imageEntry.file);
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
        segmentation: {
          sourceImageDimensions: null,
          annotationDimensions: null
        }
      });
      continue;
    }

    const annotationDimensions = await resolveImageDimensions(annotationEntry.file);
    if (!annotationDimensions) {
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
        segmentation: {
          sourceImageDimensions,
          annotationDimensions: null
        }
      });
      continue;
    }

    const sameSize = sourceImageDimensions.width === annotationDimensions.width
      && sourceImageDimensions.height === annotationDimensions.height;

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
              annotationDimensions.width,
              annotationDimensions.height
            ]
          }]
        },
        segmentation: {
          sourceImageDimensions,
          annotationDimensions
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
      segmentation: {
        sourceImageDimensions,
        annotationDimensions
      }
    });
  }

  return {
    mode: "segmentation",
    records,
    summary: buildSummary(records),
    classes: [],
    hasClassesMetadata: false
  };
};

export const buildReviewDataset = async (input: BuildReviewDatasetInput): Promise<ReviewDatasetResult> => {
  if (input.mode === "detection") {
    return buildDetectionReviewDataset(input);
  }
  return buildSegmentationReviewDataset(input);
};
