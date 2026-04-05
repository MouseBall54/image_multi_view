import { describe, expect, it } from "vitest";

import { createFolderIntakeCandidate } from "../utils/folder";
import {
  discoverReviewSupportFromImageFolder,
  filesFromDroppedFilesForReviewIntake
} from "../utils/reviewFolderIntake";
import { createSyntheticFile } from "./runtimeTestHelpers";

type MockFileHandle = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
};

type MockDirectoryHandle = {
  kind: "directory";
  name: string;
  entries: () => AsyncGenerator<[string, MockFileHandle | MockDirectoryHandle], void, unknown>;
};

const createFileHandle = (file: File): MockFileHandle => ({
  kind: "file",
  name: file.name,
  getFile: async () => file
});

const createDirectoryHandle = (
  name: string,
  entries: Array<MockFileHandle | MockDirectoryHandle>
): MockDirectoryHandle => ({
  kind: "directory",
  name,
  async *entries() {
    for (const entry of entries) {
      yield [entry.name, entry];
    }
  }
});

describe("runtime review folder intake", () => {
  it("accepts role-aware dropped files for detection and segmentation annotations", () => {
    const detectionCandidate = filesFromDroppedFilesForReviewIntake([
      createSyntheticFile("sample.txt", { content: "0 0.5 0.5 0.2 0.2" }),
      createSyntheticFile("classes.yaml", { content: "0: person\n1: car\n" }),
      createSyntheticFile("notes.md", { content: "ignore" })
    ], "annotations", "detection");

    expect(detectionCandidate?.data.files.size).toBe(2);
    expect(Array.from(detectionCandidate?.data.files.keys() ?? [])).toEqual(["sample.txt", "classes.yaml"]);

    const segmentationCandidate = filesFromDroppedFilesForReviewIntake([
      createSyntheticFile("sample.png", { type: "image/png" }),
      createSyntheticFile("sample.seg.json", { content: "{}" }),
      createSyntheticFile("notes.md", { content: "ignore" })
    ], "annotations", "segmentation");

    expect(segmentationCandidate?.data.files.size).toBe(2);
    expect(Array.from(segmentationCandidate?.data.files.keys() ?? [])).toEqual(["sample.png", "sample.seg.json"]);
  });

  it("discovers detection and segmentation-ready child folders from a picker-backed image folder", async () => {
    const imageA = createSyntheticFile("a.png", { type: "image/png" });
    const imageB = createSyntheticFile("b.png", { type: "image/png" });
    const labelA = createSyntheticFile("a.txt", { content: "0 0.5 0.5 0.2 0.2" });
    const labelMeta = createSyntheticFile("classes.yaml", { content: "0: person\n" });
    const maskA = createSyntheticFile("a.png", { type: "image/png" });
    const maskSidecar = createSyntheticFile("a.seg.json", { content: "{}" });

    const labelHandle = createDirectoryHandle("label", [
      createFileHandle(labelA),
      createFileHandle(labelMeta)
    ]);
    const maskHandle = createDirectoryHandle("mask", [
      createFileHandle(maskA),
      createFileHandle(maskSidecar)
    ]);
    const imageRootHandle = createDirectoryHandle("images", [
      createFileHandle(imageA),
      createFileHandle(imageB),
      labelHandle,
      maskHandle
    ]);

    const imageFolder = createFolderIntakeCandidate(
      "images",
      [[imageA.name, imageA], [imageB.name, imageB]],
      { kind: "picker", handle: imageRootHandle as unknown as FileSystemDirectoryHandle },
      { scannedEntryCount: 4, unsupportedFileCount: 2, unreadableFileCount: 0 }
    );

    const discovery = await discoverReviewSupportFromImageFolder(imageFolder);
    expect(discovery).toMatchObject({ kind: "available" });

    if (!discovery || discovery.kind !== "available") {
      return;
    }

    expect(discovery.suggestions).toEqual([
      expect.objectContaining({
        mode: "detection",
        folderName: "label",
        matchedBasenameCount: 1,
        hasMetadata: true
      }),
      expect.objectContaining({
        mode: "segmentation",
        folderName: "mask",
        matchedBasenameCount: 1,
        hasMetadata: true
      })
    ]);
  });

  it("reports support discovery as unavailable for loose dropped image files", async () => {
    const imageFolder = createFolderIntakeCandidate(
      "Dropped files",
      [[
        "a.png",
        createSyntheticFile("a.png", { type: "image/png" })
      ]],
      { kind: "files" }
    );

    const discovery = await discoverReviewSupportFromImageFolder(imageFolder);
    expect(discovery).toEqual({
      kind: "unavailable",
      message: "Folder-based suggestions unavailable for loose files."
    });
  });
});
