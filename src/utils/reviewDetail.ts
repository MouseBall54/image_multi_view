import type { ReviewType } from "../types";
import type { ReviewDatasetRecord } from "./reviewDataset";
import { canRenderSegmentationOverlay } from "./reviewOverlay";

type ReviewRecordNavigation = {
  selectedRecord: ReviewDatasetRecord | null;
  selectedIndex: number;
  previousRecord: ReviewDatasetRecord | null;
  nextRecord: ReviewDatasetRecord | null;
};

export type ReviewMaskOpacityState = {
  disabled: boolean;
  message: string;
};

export const getReviewSelectedFilename = (record: ReviewDatasetRecord | null): string => {
  if (!record) {
    return "No file selected";
  }

  return record.sourceImageName ?? record.annotationName ?? record.basename;
};

export const buildReviewNavigation = (
  visibleRecords: ReviewDatasetRecord[],
  selectedReviewItemId: string | null
): ReviewRecordNavigation => {
  if (visibleRecords.length === 0) {
    return {
      selectedRecord: null,
      selectedIndex: -1,
      previousRecord: null,
      nextRecord: null
    };
  }

  const selectedIndex = visibleRecords.findIndex((record) => record.basename === selectedReviewItemId);
  const resolvedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selectedRecord = visibleRecords[resolvedIndex] ?? null;

  return {
    selectedRecord,
    selectedIndex: resolvedIndex,
    previousRecord: resolvedIndex > 0 ? visibleRecords[resolvedIndex - 1] ?? null : null,
    nextRecord: resolvedIndex < visibleRecords.length - 1 ? visibleRecords[resolvedIndex + 1] ?? null : null
  };
};

const formatCountLabel = (count: number, singular: string, plural = `${singular}s`): string => {
  return `${count} ${count === 1 ? singular : plural}`;
};

export const buildReviewDetectionSummary = (record: ReviewDatasetRecord | null): string => {
  if (!record) {
    return "No detection record selected.";
  }

  const objects = record.detection?.objects ?? [];
  const objectSummary = formatCountLabel(objects.length, "object");

  if (objects.length === 0) {
    if (record.status === "unmatched") {
      return `${objectSummary} · annotation file is missing for this image.`;
    }

    if (record.status === "invalid") {
      return `${objectSummary} · ${formatCountLabel(record.validation.reasons.length, "annotation issue")} found in the selected label file.`;
    }

    return `${objectSummary} · no class context is available for the selected record.`;
  }

  const uniqueClasses = Array.from(
    new Set(
      objects.map((object) => object.className || String(object.classId))
    )
  );
  const visibleClassNames = uniqueClasses.slice(0, 3);
  const hiddenClassCount = uniqueClasses.length - visibleClassNames.length;
  const classSummary = visibleClassNames.length > 0
    ? `classes ${visibleClassNames.join(", ")}${hiddenClassCount > 0 ? ` +${hiddenClassCount} more` : ""}`
    : "class context unavailable";
  const issueSummary = record.status === "invalid"
    ? ` · ${formatCountLabel(record.validation.reasons.length, "annotation issue")}`
    : "";

  return `${objectSummary} · ${classSummary}${issueSummary}`;
};

const formatReviewValidationValues = (record: ReviewDatasetRecord, values: number[] | undefined): string => {
  if (!values || values.length === 0) {
    return "";
  }

  if (record.status === "invalid" && record.segmentation && values.length === 4) {
    return ` Source ${values[0]}×${values[1]}, mask ${values[2]}×${values[3]}.`;
  }

  return ` Values: ${values.join(", ")}.`;
};

export const buildReviewRecordErrorMessages = (record: ReviewDatasetRecord | null): string[] => {
  if (!record || record.validation.valid || record.validation.reasons.length === 0) {
    return [];
  }

  return record.validation.reasons.map((reason) => {
    const location: string[] = [];
    if (reason.side) {
      location.push(reason.side === "annotation" ? "annotation" : "image");
    }
    if (typeof reason.line === "number") {
      location.push(`line ${reason.line}`);
    }

    const prefix = location.length > 0 ? `${location.join(" · ")} — ` : "";
    return `${prefix}${reason.message}${formatReviewValidationValues(record, reason.values)}`;
  });
};

export const getReviewMaskOpacityState = (params: {
  reviewType: ReviewType;
  record: ReviewDatasetRecord | null;
  hasMaskOverlaySource: boolean;
}): ReviewMaskOpacityState => {
  const { reviewType, record, hasMaskOverlaySource } = params;

  if (reviewType !== "segmentation") {
    return {
      disabled: true,
      message: "Mask opacity applies only to segmentation overlays."
    };
  }

  if (!record) {
    return {
      disabled: true,
      message: "Select a segmentation record to adjust mask opacity."
    };
  }

  if (record.status === "unmatched") {
    return {
      disabled: true,
      message: "Mask opacity is unavailable until the selected image has a matching mask file."
    };
  }

  if (!canRenderSegmentationOverlay(record)) {
    return {
      disabled: true,
      message: "Mask opacity is unavailable because the selected record failed segmentation validation."
    };
  }

  if (!hasMaskOverlaySource) {
    return {
      disabled: true,
      message: "Mask overlay is still loading or could not be prepared for the selected record."
    };
  }

  return {
    disabled: false,
    message: "Adjust the selected mask overlay opacity on the review canvas."
  };
};
