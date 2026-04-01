import { describe, expect, it, vi } from "vitest";

import type { FolderKey } from "../types";
import { createFolderIntakeCandidate } from "../utils/folder";
import { ALL_FOLDER_KEYS, applyFolderIntake } from "../utils/folderIntake";
import { createSyntheticFile } from "./runtimeTestHelpers";

type SetFolderArgs = {
  key: FolderKey;
  alias: string;
  fileCount: number;
};

const createIntake = (
  folderName: string,
  files: File[],
  stats?: { scannedEntryCount?: number; unsupportedFileCount?: number; unreadableFileCount?: number }
) => {
  return createFolderIntakeCandidate(
    folderName,
    files.map((file) => [file.name, file] as [string, File]),
    { kind: "files" },
    stats
  );
};

describe("runtime folder intake boundaries", () => {
  it("covers all supported folder keys through Z", () => {
    expect(ALL_FOLDER_KEYS).toHaveLength(26);
    expect(ALL_FOLDER_KEYS[0]).toBe("A");
    expect(ALL_FOLDER_KEYS[25]).toBe("Z");
  });

  it("accepts a valid folder intake and assigns first empty slot", () => {
    const setCalls: SetFolderArgs[] = [];
    const addToast = vi.fn();
    const intake = createIntake("sample-folder", [
      createSyntheticFile("a.png", { type: "image/png" }),
      createSyntheticFile("b.jpg", { type: "image/jpeg" })
    ]);

    const result = applyFolderIntake({
      candidate: intake,
      getFolders: () => ({}),
      setFolder: (key, state) => {
        setCalls.push({ key, alias: state.alias, fileCount: state.data.files.size });
      },
      addToast,
      showSuccessToast: true
    });

    expect(result.accepted).toBe(true);
    expect(result.key).toBe("A");
    expect(setCalls).toEqual([{ key: "A", alias: "sample-folder", fileCount: 2 }]);
  });

  it("rejects duplicate folder import attempts", () => {
    const duplicateFile = createSyntheticFile("same.png", { type: "image/png" });
    const existingIntake = createIntake("dup-folder", [duplicateFile]);
    const duplicateIntake = createIntake("dup-folder", [duplicateFile]);
    const setFolder = vi.fn();
    const addToast = vi.fn();

    const result = applyFolderIntake({
      candidate: duplicateIntake,
      getFolders: () => ({
        B: {
          data: existingIntake.data,
          alias: existingIntake.data.name
        }
      }),
      setFolder,
      addToast,
      showSuccessToast: true
    });

    expect(result.accepted).toBe(false);
    expect(setFolder).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        title: "Duplicate Folder"
      })
    );
  });

  it("rejects empty folders produced by unsupported-only contents", () => {
    const setFolder = vi.fn();
    const addToast = vi.fn();
    const emptyIntake = createIntake("unsupported-folder", [], {
      scannedEntryCount: 3,
      unsupportedFileCount: 3,
      unreadableFileCount: 0
    });

    const result = applyFolderIntake({
      candidate: emptyIntake,
      getFolders: () => ({}),
      setFolder,
      addToast
    });

    expect(result.accepted).toBe(false);
    expect(setFolder).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        title: "Empty Folder"
      })
    );
  });

  it("rejects unreadable folder content when no valid file remains", () => {
    const setFolder = vi.fn();
    const addToast = vi.fn();
    const unreadableOnly = createIntake("unreadable-folder", [], {
      scannedEntryCount: 2,
      unsupportedFileCount: 0,
      unreadableFileCount: 2
    });

    const result = applyFolderIntake({
      candidate: unreadableOnly,
      getFolders: () => ({}),
      setFolder,
      addToast
    });

    expect(result.accepted).toBe(false);
    expect(setFolder).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        title: "Empty Folder"
      })
    );
  });

  it("accepts mixed valid/invalid folder content and surfaces a warning", () => {
    const setFolder = vi.fn();
    const addToast = vi.fn();
    const mixedIntake = createIntake("mixed-folder", [
      createSyntheticFile("valid.tif", { type: "image/tiff" })
    ], {
      scannedEntryCount: 4,
      unsupportedFileCount: 2,
      unreadableFileCount: 1
    });

    const result = applyFolderIntake({
      candidate: mixedIntake,
      getFolders: () => ({}),
      setFolder,
      addToast,
      targetKey: "Z"
    });

    expect(result.accepted).toBe(true);
    expect(result.key).toBe("Z");
    expect(setFolder).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        title: "Partial Folder Import"
      })
    );
  });

  it("uses live evolving state for sequential multi-folder intake", () => {
    const state: {
      folders: Partial<Record<FolderKey, { data: ReturnType<typeof createIntake>["data"]; alias: string }>>;
    } = { folders: {} };
    const assignedKeys: FolderKey[] = [];

    const firstIntake = createIntake("batch-1", [createSyntheticFile("first.png", { type: "image/png" })]);
    const secondIntake = createIntake("batch-2", [createSyntheticFile("second.png", { type: "image/png" })]);

    const setFolder = (key: FolderKey, folderState: { data: ReturnType<typeof createIntake>["data"]; alias: string }) => {
      state.folders = { ...state.folders, [key]: folderState };
      assignedKeys.push(key);
    };

    const first = applyFolderIntake({
      candidate: firstIntake,
      getFolders: () => state.folders,
      setFolder
    });
    const second = applyFolderIntake({
      candidate: secondIntake,
      getFolders: () => state.folders,
      setFolder
    });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    expect(assignedKeys).toEqual(["A", "B"]);
    expect(state.folders.A?.alias).toBe("batch-1");
    expect(state.folders.B?.alias).toBe("batch-2");
  });
});
