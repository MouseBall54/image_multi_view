import { beforeEach, describe, expect, it } from "vitest";

import { useStore } from "../store";
import type { FolderKey } from "../types";
import { createSyntheticFile } from "./runtimeTestHelpers";

const DEFAULT_VIEWER_ORDER = Array.from({ length: 26 }, (_, index) => index);

const resetReorderState = () => {
  useStore.setState({
    appMode: "compare",
    numViewers: 4,
    viewerRows: 2,
    viewerCols: 2,
    pinpointReorderMode: "shift",
    viewerOrder: [...DEFAULT_VIEWER_ORDER],
    pinpointImages: {},
    pinpointScales: {},
    pinpointRotations: {},
    viewerFilters: {},
    viewerFilterParams: {},
    analysisFilters: {},
    analysisFilterParams: {}
  });
};

describe("runtime reorder consistency", () => {
  beforeEach(() => {
    resetReorderState();
  });

  it("uses one store order contract across compare, pinpoint, and analysis", () => {
    const store = useStore.getState();
    store.reorderViewers(0, 2);

    const next = useStore.getState();
    expect(next.viewerOrder.slice(0, 4)).toEqual([1, 2, 0, 3]);
    expect(next.getViewerContentAtPosition(0, "compare")).toBe("B");
    expect(next.getViewerContentAtPosition(1, "pinpoint")).toBe("C");
    expect(next.getViewerContentAtPosition(2, "analysis")).toBe(0);

    next.setAppMode("pinpoint");
    expect(useStore.getState().getViewerContentAtPosition(0, "pinpoint")).toBe("B");

    useStore.getState().setAppMode("analysis");
    expect(useStore.getState().getViewerContentAtPosition(0, "analysis")).toBe(1);
  });

  it("keeps partial pinpoint/filter state stable without undefined-slot corruption", () => {
    const fileA = createSyntheticFile("slot-a.png", { type: "image/png" });
    const fileC = createSyntheticFile("slot-c.png", { type: "image/png" });

    useStore.setState({
      pinpointImages: {
        A: { file: fileA, refPoint: { x: 0.25, y: 0.75 }, sourceKey: "A" },
        C: { file: fileC, refPoint: { x: 0.5, y: 0.5 }, sourceKey: "C" }
      },
      pinpointScales: { A: 1.2 },
      pinpointRotations: { C: 12 },
      viewerFilters: { A: "gammacorrection" as any },
      viewerFilterParams: { A: { gamma: 1.1 } as any },
      analysisFilters: { 0: "gammacorrection" as any, 2: "none" as any },
      analysisFilterParams: { 0: { gamma: 1.3 } as any }
    });

    useStore.getState().reorderViewers(0, 2);
    const next = useStore.getState();

    expect(Object.keys(next.pinpointScales).sort()).toEqual(["A"]);
    expect(next.pinpointScales.B as number | undefined).toBeUndefined();
    expect(Object.keys(next.viewerFilters).sort()).toEqual(["A"]);
    expect(next.viewerFilters.B as string | undefined).toBeUndefined();

    const pinpointKeyAtPosition2 = next.getViewerContentAtPosition(2, "pinpoint") as FolderKey;
    expect(pinpointKeyAtPosition2).toBe("A");
    expect(next.pinpointImages[pinpointKeyAtPosition2]?.file?.name).toBe("slot-a.png");

    const analysisSlotAtPosition1 = next.getViewerContentAtPosition(1, "analysis") as number;
    const analysisSlotAtPosition2 = next.getViewerContentAtPosition(2, "analysis") as number;
    expect(analysisSlotAtPosition1).toBe(2);
    expect(analysisSlotAtPosition2).toBe(0);
    expect(next.analysisFilters[analysisSlotAtPosition1]).toBe("none");
    expect(next.analysisFilters[analysisSlotAtPosition2]).toBe("gammacorrection");
  });

  it("preserves compare-origin reorder when entering pinpoint and analysis views", () => {
    useStore.setState({
      pinpointImages: {
        A: { file: createSyntheticFile("a.png", { type: "image/png" }), refPoint: { x: 0.5, y: 0.5 }, sourceKey: "A" },
        B: { file: createSyntheticFile("b.png", { type: "image/png" }), refPoint: { x: 0.5, y: 0.5 }, sourceKey: "B" }
      },
      analysisFilters: { 0: "gammacorrection" as any, 1: "none" as any }
    });

    useStore.getState().setAppMode("compare");
    useStore.getState().reorderViewers(0, 1);

    useStore.getState().setAppMode("pinpoint");
    const pinpointFirstKey = useStore.getState().getViewerContentAtPosition(0, "pinpoint") as FolderKey;
    expect(pinpointFirstKey).toBe("B");
    expect(useStore.getState().pinpointImages[pinpointFirstKey]?.file?.name).toBe("b.png");

    useStore.getState().setAppMode("analysis");
    expect(useStore.getState().getViewerContentAtPosition(0, "analysis")).toBe(1);
  });
});
