import { describe, expect, it } from "vitest";

import {
  buildReviewDataset,
  type ImageDimensionResolver,
  type SegmentationMaskAnalysisResolver,
  type SegmentationSidecarResolver,
  type ReviewDatasetRecord
} from "../utils/reviewDataset";
import { createSyntheticFile } from "./runtimeTestHelpers";

const toMap = (files: File[]): Map<string, File> => {
  return new Map(files.map((file) => [file.name, file] as [string, File]));
};

const getRecordByBasename = (records: ReviewDatasetRecord[], basename: string): ReviewDatasetRecord => {
  const record = records.find((item) => item.basename === basename);
  expect(record).toBeDefined();
  return record as ReviewDatasetRecord;
};

describe("runtime review dataset utility", () => {
  it("classifies mixed detection dataset into matched, unmatched, and invalid records deterministically", async () => {
    const imageFiles = toMap([
      createSyntheticFile("good.jpg", { type: "image/jpeg" }),
      createSyntheticFile("empty.jpg", { type: "image/jpeg" }),
      createSyntheticFile("malformed.jpg", { type: "image/jpeg" }),
      createSyntheticFile("nonNumeric.jpg", { type: "image/jpeg" }),
      createSyntheticFile("outRange.jpg", { type: "image/jpeg" }),
      createSyntheticFile("noLabel.jpg", { type: "image/jpeg" })
    ]);

    const annotationFiles = toMap([
      createSyntheticFile("good.txt", { content: "1 0.5 0.5 0.2 0.2\n3 0.3 0.3 0.1 0.1" }),
      createSyntheticFile("empty.txt", { content: "\n\n" }),
      createSyntheticFile("malformed.txt", { content: "0 0.1 0.2 0.3" }),
      createSyntheticFile("nonNumeric.txt", { content: "a 0.2 0.3 0.4 0.5" }),
      createSyntheticFile("outRange.txt", { content: "1 1.2 0.5 0.2 0.2" }),
      createSyntheticFile("orphan.txt", { content: "0 0.2 0.2 0.2 0.2" }),
      createSyntheticFile("classes.txt", { content: "person\ncar\n" }),
      createSyntheticFile("junk.json", { content: "{}" })
    ]);

    const result = await buildReviewDataset({
      mode: "detection",
      imageFiles,
      annotationFiles
    });

    expect(result.mode).toBe("detection");
    expect(result.records.map((record) => record.basename)).toEqual([
      "empty",
      "good",
      "malformed",
      "noLabel",
      "nonNumeric",
      "orphan",
      "outRange"
    ]);
    expect(result.summary).toEqual({ matched: 1, unmatched: 2, invalid: 4 });

    const empty = getRecordByBasename(result.records, "empty");
    expect(empty.status).toBe("invalid");
    expect(empty.validation.reasons[0]?.code).toBe("yolo_empty");

    const malformed = getRecordByBasename(result.records, "malformed");
    expect(malformed.status).toBe("invalid");
    expect(malformed.validation.reasons[0]?.code).toBe("yolo_row_column_count");

    const nonNumeric = getRecordByBasename(result.records, "nonNumeric");
    expect(nonNumeric.status).toBe("invalid");
    expect(nonNumeric.validation.reasons[0]?.code).toBe("yolo_non_numeric");

    const outRange = getRecordByBasename(result.records, "outRange");
    expect(outRange.status).toBe("invalid");
    expect(outRange.validation.reasons[0]?.code).toBe("yolo_value_out_of_range");

    const noLabel = getRecordByBasename(result.records, "noLabel");
    expect(noLabel.status).toBe("unmatched");
    expect(noLabel.validation.reasons[0]?.code).toBe("missing_annotation");

    const orphan = getRecordByBasename(result.records, "orphan");
    expect(orphan.status).toBe("unmatched");
    expect(orphan.validation.reasons[0]?.code).toBe("missing_image");

    const good = getRecordByBasename(result.records, "good");
    expect(good.status).toBe("matched");
    expect(good.detection?.objects).toHaveLength(2);
    expect(good.detection?.objects[0]?.className).toBe("car");
    expect(good.detection?.objects[1]?.className).toBe("3");
    expect(good.classIds).toEqual([1, 3]);

    expect(result.hasClassesMetadata).toBe(true);
    expect(result.classes).toEqual(["person", "car"]);
    expect(result.classCatalog).toEqual([
      { id: 0, label: "person", recordCount: 0, hasMetadata: true },
      { id: 1, label: "car", recordCount: 1, hasMetadata: true },
      { id: 3, label: "3", recordCount: 1, hasMetadata: false }
    ]);
  });

  it("falls back to numeric class labels when classes metadata is absent", async () => {
    const result = await buildReviewDataset({
      mode: "detection",
      imageFiles: toMap([createSyntheticFile("single.png", { type: "image/png" })]),
      annotationFiles: toMap([
        createSyntheticFile("single.txt", { content: "5 0.4 0.6 0.1 0.2" })
      ])
    });

    expect(result.hasClassesMetadata).toBe(false);
    expect(result.classes).toEqual([]);
    expect(result.summary).toEqual({ matched: 1, unmatched: 0, invalid: 0 });
    const single = getRecordByBasename(result.records, "single");
    expect(single.classIds).toEqual([5]);
    expect(single.detection?.objects[0]?.className).toBe("5");
    expect(result.classCatalog).toEqual([
      { id: 5, label: "5", recordCount: 1, hasMetadata: false }
    ]);
  });

  it("parses lightweight classes.yaml metadata for detection review", async () => {
    const result = await buildReviewDataset({
      mode: "detection",
      imageFiles: toMap([createSyntheticFile("sample.png", { type: "image/png" })]),
      annotationFiles: toMap([
        createSyntheticFile("sample.txt", { content: "3 0.5 0.5 0.2 0.2" }),
        createSyntheticFile("classes.yaml", { content: "0: background\n1: person\n3: wheel\n" })
      ])
    });

    const sample = getRecordByBasename(result.records, "sample");
    expect(result.hasClassesMetadata).toBe(true);
    expect(sample.detection?.objects[0]?.className).toBe("wheel");
    expect(result.classCatalog).toEqual([
      { id: 0, label: "background", recordCount: 0, hasMetadata: true },
      { id: 1, label: "person", recordCount: 0, hasMetadata: true },
      { id: 3, label: "wheel", recordCount: 1, hasMetadata: true }
    ]);
  });

  it("marks segmentation decode failure and size mismatch as invalid without blocking valid pairs", async () => {
    const okImage = createSyntheticFile("ok.png", { type: "image/png" });
    const okMask = createSyntheticFile("ok.png", { type: "image/png", lastModified: 1 });
    const mismatchImage = createSyntheticFile("mismatch.png", { type: "image/png" });
    const mismatchMask = createSyntheticFile("mismatch.png", { type: "image/png", lastModified: 1 });
    const decodeImageSource = createSyntheticFile("decodeImage.png", { type: "image/png" });
    const decodeImageMask = createSyntheticFile("decodeImage.png", { type: "image/png", lastModified: 1 });
    const decodeMaskImage = createSyntheticFile("decodeMask.png", { type: "image/png" });
    const decodeMaskMask = createSyntheticFile("decodeMask.png", { type: "image/png", lastModified: 1 });

    const imageFiles = toMap([
      okImage,
      mismatchImage,
      createSyntheticFile("missingMask.png", { type: "image/png" }),
      decodeImageSource,
      decodeMaskImage
    ]);

    const annotationFiles = toMap([
      okMask,
      mismatchMask,
      decodeImageMask,
      decodeMaskMask,
      createSyntheticFile("orphanOnly.png", { type: "image/png" }),
      createSyntheticFile("notes.md", { content: "not a mask" })
    ]);

    const resolver: ImageDimensionResolver = async (file) => {
      if (file === okImage) {
        return { width: 100, height: 80 };
      }
      if (file === mismatchImage) {
        return { width: 120, height: 120 };
      }
      if (file === decodeImageSource) {
        return null;
      }
      if (file === decodeMaskImage) {
        return { width: 64, height: 64 };
      }
      return { width: 50, height: 50 };
    };

    const segmentationMaskResolver: SegmentationMaskAnalysisResolver = async (file) => {
      if (file === okMask) {
        return { dimensions: { width: 100, height: 80 }, classIds: [1, 3] };
      }
      if (file === mismatchMask) {
        return { dimensions: { width: 120, height: 100 }, classIds: [2] };
      }
      if (file === decodeImageMask) {
        return { dimensions: { width: 64, height: 64 }, classIds: [4] };
      }
      if (file === decodeMaskMask) {
        return { dimensions: null, classIds: [9] };
      }
      return { dimensions: { width: 50, height: 50 }, classIds: [] };
    };

    const segmentationSidecarResolver: SegmentationSidecarResolver = async (file) => {
      if (file.name === "ok.seg.json") {
        return { activeClassId: 3, hiddenClassIds: [1], overlayOpacity: 0.6 };
      }
      return null;
    };

    annotationFiles.set("ok.seg.json", createSyntheticFile("ok.seg.json", { content: "{}" }));

    const result = await buildReviewDataset({
      mode: "segmentation",
      imageFiles,
      annotationFiles,
      resolveImageDimensions: resolver,
      resolveSegmentationMask: segmentationMaskResolver,
      resolveSegmentationSidecar: segmentationSidecarResolver
    });

    expect(result.mode).toBe("segmentation");
    expect(result.records.map((record) => record.basename)).toEqual([
      "decodeImage",
      "decodeMask",
      "mismatch",
      "missingMask",
      "ok",
      "orphanOnly"
    ]);
    expect(result.summary).toEqual({ matched: 1, unmatched: 2, invalid: 3 });

    const ok = getRecordByBasename(result.records, "ok");
    expect(ok.status).toBe("matched");
    expect(ok.classIds).toEqual([1, 3]);
    expect(ok.segmentation?.sourceImageDimensions).toEqual({ width: 100, height: 80 });
    expect(ok.segmentation?.annotationDimensions).toEqual({ width: 100, height: 80 });
    expect(ok.segmentation?.sidecarState).toEqual({ activeClassId: 3, hiddenClassIds: [1], overlayOpacity: 0.6 });

    const mismatch = getRecordByBasename(result.records, "mismatch");
    expect(mismatch.status).toBe("invalid");
    expect(mismatch.validation.reasons[0]?.code).toBe("segmentation_dimension_mismatch");
    expect(mismatch.classIds).toEqual([2]);

    const decodeImage = getRecordByBasename(result.records, "decodeImage");
    expect(decodeImage.status).toBe("invalid");
    expect(decodeImage.validation.reasons[0]?.code).toBe("segmentation_decode_failed");
    expect(decodeImage.validation.reasons[0]?.side).toBe("image");
    expect(decodeImage.classIds).toEqual([4]);

    const decodeMask = getRecordByBasename(result.records, "decodeMask");
    expect(decodeMask.status).toBe("invalid");
    expect(decodeMask.validation.reasons[0]?.code).toBe("segmentation_decode_failed");
    expect(decodeMask.validation.reasons[0]?.side).toBe("annotation");
    expect(decodeMask.classIds).toEqual([9]);

    const missingMask = getRecordByBasename(result.records, "missingMask");
    expect(missingMask.status).toBe("unmatched");
    expect(missingMask.validation.reasons[0]?.code).toBe("missing_annotation");

    const orphan = getRecordByBasename(result.records, "orphanOnly");
    expect(orphan.status).toBe("unmatched");
    expect(orphan.validation.reasons[0]?.code).toBe("missing_image");
    expect(result.classCatalog).toEqual([
      { id: 1, label: "1", recordCount: 1, hasMetadata: false },
      { id: 2, label: "2", recordCount: 1, hasMetadata: false },
      { id: 3, label: "3", recordCount: 1, hasMetadata: false },
      { id: 4, label: "4", recordCount: 1, hasMetadata: false },
      { id: 9, label: "9", recordCount: 1, hasMetadata: false }
    ]);
  });
});
