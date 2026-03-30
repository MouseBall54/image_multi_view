import { beforeEach, describe, expect, it } from "vitest";

import { useStore } from "../store";
import type { FolderKey } from "../types";
import { createSyntheticFile } from "./runtimeTestHelpers";

const DEFAULT_VIEWER_ORDER = Array.from({ length: 26 }, (_, index) => index);

const makeFolder = (alias: string, files: File[]) => ({
  alias,
  data: {
    name: alias,
    files: new Map(files.map((file) => [file.name, file] as const)),
    meta: new Map(),
    source: { kind: "files" as const }
  }
});

const resetRecoveryState = () => {
  useStore.setState({
    appMode: "compare",
    numViewers: 4,
    viewerRows: 2,
    viewerCols: 2,
    viewerOrder: [...DEFAULT_VIEWER_ORDER],
    folders: {},
    current: null,
    activeCanvasKey: null,
    activeFilterEditor: null,
    rectZoomTarget: null,
    selectedViewers: [],
    pinpointImages: {},
    pinpoints: {},
    pinpointScales: {},
    pinpointRotations: {},
    analysisFile: null,
    analysisFileSource: null,
    analysisFilters: {},
    analysisFilterParams: {}
  });
};

describe("runtime recovery safeguards", () => {
  beforeEach(() => {
    resetRecoveryState();
  });

  it("remaps or clears current file selection safely after folder removal", () => {
    const shared = createSyntheticFile("shared.png", { type: "image/png" });
    const onlyA = createSyntheticFile("only-a.png", { type: "image/png" });

    const store = useStore.getState();
    store.setFolder("A", makeFolder("A-src", [shared, onlyA]));
    store.setFolder("B", makeFolder("B-src", [shared]));

    useStore.setState({
      current: {
        filename: "shared.png",
        has: {
          A: true, B: true, C: false, D: false, E: false, F: false, G: false, H: false,
          I: false, J: false, K: false, L: false, M: false, N: false, O: false, P: false,
          Q: false, R: false, S: false, T: false, U: false, V: false, W: false, X: false,
          Y: false, Z: false
        }
      }
    });

    useStore.getState().clearFolder("A");
    const afterA = useStore.getState();
    expect(afterA.current?.filename).toBe("shared.png");
    expect(afterA.current?.has.A).toBe(false);
    expect(afterA.current?.has.B).toBe(true);

    useStore.getState().clearFolder("B");
    expect(useStore.getState().current).toBeNull();
  });

  it("preserves same-slot UI refs while clearing stale pinpoint and analysis references on refresh-style replacement", () => {
    const keep = createSyntheticFile("keep.png", { type: "image/png" });
    const removed = createSyntheticFile("removed.png", { type: "image/png" });

    const store = useStore.getState();
    store.setFolder("A", makeFolder("A-src", [keep, removed]));
    store.setFolder("B", makeFolder("B-src", [keep]));

    useStore.setState({
      activeCanvasKey: "A",
      activeFilterEditor: "A",
      rectZoomTarget: "A",
      selectedViewers: ["A", "B"],
      pinpointImages: {
        B: { file: removed, refPoint: { x: 0.5, y: 0.5 }, sourceKey: "A" as FolderKey }
      },
      pinpoints: { B: { x: 0.2, y: 0.3 } },
      pinpointScales: { B: 1.4 },
      pinpointRotations: { B: 15 },
      analysisFile: removed,
      analysisFileSource: "A-src",
      analysisFilters: { 0: "gammacorrection" as any },
      analysisFilterParams: { 0: { gamma: 1.3 } as any }
    });

    useStore.getState().setFolder("A", makeFolder("A-src", [keep]));

    const next = useStore.getState();
    expect(next.activeCanvasKey).toBe("A");
    expect(next.activeFilterEditor).toBe("A");
    expect(next.rectZoomTarget).toBe("A");
    expect(next.selectedViewers).toEqual(["A", "B"]);

    expect(next.pinpointImages.B).toBeUndefined();
    expect(next.pinpoints.B).toBeUndefined();
    expect(next.pinpointScales.B).toBeUndefined();
    expect(next.pinpointRotations.B).toBeUndefined();

    expect(next.analysisFile).toBeNull();
    expect(next.analysisFileSource).toBeNull();
    expect(Object.keys(next.analysisFilters)).toHaveLength(0);
    expect(Object.keys(next.analysisFilterParams)).toHaveLength(0);
  });

  it("clears key-based UI refs when the folder is actually removed", () => {
    const keep = createSyntheticFile("keep.png", { type: "image/png" });

    const store = useStore.getState();
    store.setFolder("A", makeFolder("A-src", [keep]));
    useStore.setState({
      activeCanvasKey: "A",
      activeFilterEditor: "A",
      rectZoomTarget: "A",
      selectedViewers: ["A"]
    });

    store.clearFolder("A");

    const next = useStore.getState();
    expect(next.activeCanvasKey).toBeNull();
    expect(next.activeFilterEditor).toBeNull();
    expect(next.rectZoomTarget).toBeNull();
    expect(next.selectedViewers).toEqual([]);
  });

  it("preserves valid pinpoint assignment across same-folder update when source file still exists", () => {
    const keep = createSyntheticFile("keep.png", { type: "image/png" });
    const extra = createSyntheticFile("extra.png", { type: "image/png" });

    const store = useStore.getState();
    store.setFolder("A", makeFolder("A-src", [keep]));

    useStore.setState({
      pinpointImages: {
        B: { file: keep, refPoint: { x: 0.4, y: 0.6 }, sourceKey: "A" as FolderKey }
      },
      pinpoints: { B: { x: 0.11, y: 0.22 } },
      pinpointScales: { B: 1.15 },
      pinpointRotations: { B: 7 }
    });

    store.setFolder("A", makeFolder("A-src", [keep, extra]));

    const next = useStore.getState();
    expect(next.pinpointImages.B?.file?.name).toBe("keep.png");
    expect(next.pinpointImages.B?.sourceKey).toBe("A");
    expect(next.pinpoints.B).toEqual({ x: 0.11, y: 0.22 });
    expect(next.pinpointScales.B).toBe(1.15);
    expect(next.pinpointRotations.B).toBe(7);
  });
});
