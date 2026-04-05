import { describe, expect, it } from "vitest";

import {
  buildReviewDetectionSummary,
  buildReviewNavigation,
  buildReviewRecordErrorMessages,
  getReviewMaskOpacityState,
  getReviewSelectedFilename
} from "../utils/reviewDetail";
import type { ReviewDatasetRecord } from "../utils/reviewDataset";
import { createSyntheticFile } from "./runtimeTestHelpers";

const createBaseRecord = (overrides: Partial<ReviewDatasetRecord> = {}): ReviewDatasetRecord => ({
  basename: "sample",
  sourceImageName: "sample.png",
  sourceImageFile: createSyntheticFile("sample.png", { type: "image/png" }),
  annotationName: "sample.txt",
  annotationFile: createSyntheticFile("sample.txt", { content: "0 0.5 0.5 0.4 0.4" }),
  status: "matched",
  validation: { valid: true, reasons: [] },
  classIds: [],
  ...overrides
});

describe("runtime review detail helpers", () => {
  it("keeps previous and next navigation bounded to the visible filtered list", () => {
    const first = createBaseRecord({ basename: "first" });
    const second = createBaseRecord({ basename: "second" });
    const third = createBaseRecord({ basename: "third" });
    const visibleRecords = [first, second, third];

    expect(buildReviewNavigation(visibleRecords, "first")).toMatchObject({
      selectedRecord: first,
      selectedIndex: 0,
      previousRecord: null,
      nextRecord: second
    });

    expect(buildReviewNavigation(visibleRecords, "second")).toMatchObject({
      selectedRecord: second,
      selectedIndex: 1,
      previousRecord: first,
      nextRecord: third
    });

    expect(buildReviewNavigation(visibleRecords, "third")).toMatchObject({
      selectedRecord: third,
      selectedIndex: 2,
      previousRecord: second,
      nextRecord: null
    });

    expect(buildReviewNavigation(visibleRecords, "missing")).toMatchObject({
      selectedRecord: first,
      selectedIndex: 0,
      previousRecord: null,
      nextRecord: second
    });
  });

  it("builds selected filename and compact detection summary from the active record", () => {
    const record = createBaseRecord({
      basename: "image-01",
      sourceImageName: "image-01.png",
      detection: {
        objects: [
          { classId: 0, className: "person", x: 0.5, y: 0.5, width: 0.3, height: 0.4, line: 1 },
          { classId: 2, className: "car", x: 0.2, y: 0.4, width: 0.1, height: 0.2, line: 2 },
          { classId: 0, className: "person", x: 0.7, y: 0.4, width: 0.1, height: 0.2, line: 3 }
        ]
      }
    });

    expect(getReviewSelectedFilename(record)).toBe("image-01.png");
    expect(buildReviewDetectionSummary(record)).toBe("3 objects · classes person, car");
  });

  it("formats inline invalid-record explanations from validation reasons", () => {
    const invalidRecord = createBaseRecord({
      status: "invalid",
      validation: {
        valid: false,
        reasons: [
          {
            code: "yolo_row_column_count",
            message: "YOLO row must contain exactly 5 columns.",
            line: 2
          },
          {
            code: "yolo_value_out_of_range",
            message: "YOLO normalized values must be within [0, 1].",
            line: 4,
            values: [1.2, 0.5, 0.2, 0.2]
          }
        ]
      },
      detection: {
        objects: []
      }
    });

    expect(buildReviewDetectionSummary(invalidRecord)).toBe("0 objects · 2 annotation issues found in the selected label file.");
    expect(buildReviewRecordErrorMessages(invalidRecord)).toEqual([
      "line 2 — YOLO row must contain exactly 5 columns.",
      "line 4 — YOLO normalized values must be within [0, 1]. Values: 1.2, 0.5, 0.2, 0.2."
    ]);
  });

  it("keeps mask opacity meaningful for segmentation matches and explanatory for invalid records", () => {
    const matchedSegmentationRecord = createBaseRecord({
      annotationName: "sample-mask.png",
      annotationFile: createSyntheticFile("sample-mask.png", { type: "image/png" }),
      classIds: [1, 3],
      segmentation: {
        sourceImageDimensions: { width: 64, height: 64 },
        annotationDimensions: { width: 64, height: 64 },
        sidecarState: null
      }
    });
    const invalidSegmentationRecord = createBaseRecord({
      status: "invalid",
      annotationName: "sample-mask.png",
      annotationFile: createSyntheticFile("sample-mask.png", { type: "image/png" }),
      validation: {
        valid: false,
        reasons: [
          {
            code: "segmentation_dimension_mismatch",
            message: "Mask dimensions do not match source image dimensions.",
            values: [64, 64, 32, 32]
          }
        ]
      },
      classIds: [1, 3],
      segmentation: {
        sourceImageDimensions: { width: 64, height: 64 },
        annotationDimensions: { width: 32, height: 32 },
        sidecarState: null
      }
    });

    expect(getReviewMaskOpacityState({
      reviewType: "segmentation",
      record: matchedSegmentationRecord,
      hasMaskOverlaySource: true
    })).toEqual({
      disabled: false,
      message: "Adjust the selected mask overlay opacity on the review canvas."
    });

    expect(getReviewMaskOpacityState({
      reviewType: "segmentation",
      record: matchedSegmentationRecord,
      hasMaskOverlaySource: false
    })).toEqual({
      disabled: false,
      message: "Mask overlay is loading. Opacity changes will apply once rendering is ready."
    });

    expect(getReviewMaskOpacityState({
      reviewType: "segmentation",
      record: invalidSegmentationRecord,
      hasMaskOverlaySource: false
    })).toEqual({
      disabled: true,
      message: "Mask opacity is unavailable because the selected record failed segmentation validation."
    });

    expect(getReviewMaskOpacityState({
      reviewType: "detection",
      record: createBaseRecord(),
      hasMaskOverlaySource: false
    })).toEqual({
      disabled: true,
      message: "Mask opacity applies only to segmentation overlays."
    });
  });
});
