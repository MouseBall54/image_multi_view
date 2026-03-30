import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBuildChannel } from "../utils/environment";
import { createFolderIntakeCandidate, isImageFile } from "../utils/folder";
import { applyFolderIntake } from "../utils/folderIntake";
import { useStore } from "../store";
import {
  createSyntheticFolderFixture,
  createSyntheticFile,
  createTinyFlatImageInput
} from "./runtimeTestHelpers";

const DEFAULT_VIEWER_ORDER = Array.from({ length: 26 }, (_, index) => index);

const resetSmokeState = () => {
  useStore.setState({
    appMode: "pinpoint",
    numViewers: 4,
    viewerRows: 2,
    viewerCols: 2,
    viewerOrder: [...DEFAULT_VIEWER_ORDER],
    folders: {},
    current: null,
    activeFilterEditor: null,
    tempViewerFilter: "none",
    tempViewerFilterParams: useStore.getState().tempViewerFilterParams,
    viewerFilters: {},
    viewerFilterParams: {},
    activeCanvasKey: null,
    analysisFile: null,
    analysisFileSource: null
  });
};

describe("runtime smoke", () => {
  beforeEach(() => {
    resetSmokeState();
  });

  it("imports runtime utilities without environment failures", () => {
    expect(["dev", "prod"]).toContain(getBuildChannel());
    expect(isImageFile("sample.png")).toBe(true);
  });

  it("provides reusable synthetic folder fixtures", () => {
    const fixture = createSyntheticFolderFixture();
    expect(fixture.name).toBe("folder-A");
    expect(fixture.files.size).toBe(2);
    expect(fixture.list[0]?.name).toBe("flat-1x1.png");
  });

  it("provides tiny flat image inputs for regressions", () => {
    const image = createTinyFlatImageInput(2, 1, [10, 20, 30, 255]);
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect(Array.from(image.data.slice(0, 4))).toEqual([10, 20, 30, 255]);
    expect(image.data.length).toBe(8);
  });

  it("executes recovery smoke matrix across mode, folder, reorder, and filter failure/success", () => {
    const addToast = vi.fn();
    const setFolder = useStore.getState().setFolder;

    const invalidIntake = createFolderIntakeCandidate(
      "invalid-folder",
      [],
      { kind: "files" },
      { scannedEntryCount: 1, unsupportedFileCount: 1, unreadableFileCount: 0 }
    );

    const invalidResult = applyFolderIntake({
      candidate: invalidIntake,
      getFolders: () => useStore.getState().folders,
      setFolder,
      addToast
    });
    expect(invalidResult.accepted).toBe(false);

    const validFile = createSyntheticFile("smoke.png", { type: "image/png" });
    const validIntake = createFolderIntakeCandidate(
      "smoke-folder",
      [[validFile.name, validFile]],
      { kind: "files" }
    );
    const validResult = applyFolderIntake({
      candidate: validIntake,
      getFolders: () => useStore.getState().folders,
      setFolder,
      addToast
    });

    expect(validResult.accepted).toBe(true);
    expect(validResult.key).toBe("A");

    useStore.getState().setAppMode("compare");
    useStore.getState().reorderViewers(0, 1);
    expect(useStore.getState().getViewerContentAtPosition(0, "compare")).toBe("B");

    useStore.getState().setAppMode("analysis");
    expect(useStore.getState().getViewerContentAtPosition(0, "analysis")).toBe(1);

    useStore.setState({
      current: {
        filename: "smoke.png",
        has: {
          A: true, B: false, C: false, D: false, E: false, F: false, G: false, H: false,
          I: false, J: false, K: false, L: false, M: false, N: false, O: false, P: false,
          Q: false, R: false, S: false, T: false, U: false, V: false, W: false, X: false,
          Y: false, Z: false
        }
      },
      activeFilterEditor: "A"
    });

    useStore.getState().setTempFilterType("invalid-filter-type" as any);
    useStore.getState().setTempFilterParams({ gamma: 0 });
    useStore.getState().applyTempFilterSettings();
    expect(useStore.getState().viewerFilters.A as any).toBe("invalid-filter-type");

    useStore.getState().setTempFilterType("gammacorrection");
    useStore.getState().setTempFilterParams({ gamma: 1.2 });
    useStore.getState().applyTempFilterSettings();
    expect(useStore.getState().viewerFilters.A).toBe("gammacorrection");

    useStore.setState({ activeCanvasKey: "A", activeFilterEditor: "A", selectedViewers: ["A"] });
    useStore.getState().clearFolder("A");

    expect(useStore.getState().activeCanvasKey).toBeNull();
    expect(useStore.getState().activeFilterEditor).toBeNull();
    expect(useStore.getState().selectedViewers).toEqual([]);

    const followUp = createSyntheticFile("after-invalid.png", { type: "image/png" });
    const followUpResult = applyFolderIntake({
      candidate: createFolderIntakeCandidate("post-recovery", [[followUp.name, followUp]], { kind: "files" }),
      getFolders: () => useStore.getState().folders,
      setFolder,
      addToast
    });
    expect(followUpResult.accepted).toBe(true);
    expect(useStore.getState().folders.A?.data.files.has("after-invalid.png")).toBe(true);
  });
});
