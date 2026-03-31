// @vitest-environment jsdom

import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewCanvas } from "../components/ReviewCanvas";
import { useStore } from "../store";
import type { ReviewDatasetRecord } from "../utils/reviewDataset";
import { createSyntheticFile } from "./runtimeTestHelpers";

vi.mock("../components/ImageCanvas", async () => {
  const ReactLib = await import("react");

  const MockImageCanvas = ReactLib.forwardRef<{ getCanvas: () => HTMLCanvasElement | null }, Record<string, never>>((_, ref) => {
    const canvasRef = ReactLib.useRef<HTMLCanvasElement | null>(null);

    ReactLib.useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current
    }), []);

    return ReactLib.createElement("div", { className: "viewer" },
      ReactLib.createElement("div", { className: "viewer-canvas-wrap" },
        ReactLib.createElement("canvas", { ref: canvasRef })
      )
    );
  });

  return { ImageCanvas: MockImageCanvas };
});

type MountedRoot = {
  host: HTMLDivElement;
  root: ReactDOM.Root;
};

const mountedRoots: MountedRoot[] = [];

const createSegmentationRecord = (): ReviewDatasetRecord => ({
  basename: "seg-1",
  sourceImageName: "seg-1.png",
  sourceImageFile: createSyntheticFile("seg-1.png", { type: "image/png" }),
  annotationName: "seg-1.png",
  annotationFile: createSyntheticFile("seg-1.png", { type: "image/png" }),
  status: "matched",
  validation: { valid: true, reasons: [] },
  segmentation: {
    sourceImageDimensions: { width: 64, height: 64 },
    annotationDimensions: { width: 64, height: 64 }
  }
});

const mount = async (element: React.ReactElement): Promise<MountedRoot> => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = ReactDOM.createRoot(host);
  const mounted = { host, root };
  mountedRoots.push(mounted);

  await act(async () => {
    root.render(element);
  });

  return mounted;
};

const resetState = () => {
  useStore.setState({
    reviewType: "segmentation",
    reviewOverlayVisible: true,
    reviewMaskOpacity: 0.5,
    viewport: { scale: 1, cx: 0.5, cy: 0.5 },
    compareRotation: 0
  });
};

beforeEach(() => {
  resetState();

  class ResizeObserverMock {
    observe() {}
    disconnect() {}
  }

  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
});

afterEach(async () => {
  while (mountedRoots.length > 0) {
    const mounted = mountedRoots.pop();
    if (!mounted) {
      break;
    }

    await act(async () => {
      mounted.root.unmount();
    });
    mounted.host.remove();
  }

  vi.restoreAllMocks();
});

describe("runtime review canvas interactions", () => {
  it("keeps mask opacity and overlay toggle interactive in segmentation review", async () => {
    const { host } = await mount(
      <ReviewCanvas
        reviewType="segmentation"
        record={createSegmentationRecord()}
        label="seg-1"
      />
    );

    const slider = host.querySelector('[data-testid="review-mask-opacity"]') as HTMLInputElement;
    const toggle = host.querySelector('[data-testid="review-overlay-toggle"]') as HTMLButtonElement;
    const output = host.querySelector(".review-mask-opacity-field output") as HTMLOutputElement;

    expect(slider).not.toBeNull();
    expect(toggle).not.toBeNull();
    expect(slider.disabled).toBe(false);
    expect(output.textContent).toBe("50%");

    await act(async () => {
      slider.value = "0.35";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(useStore.getState().reviewMaskOpacity).toBe(0.35);
    expect(output.textContent).toBe("35%");

    await act(async () => {
      slider.value = "0.2";
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(useStore.getState().reviewMaskOpacity).toBe(0.2);
    expect(output.textContent).toBe("20%");

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      toggle.click();
    });

    expect(useStore.getState().reviewOverlayVisible).toBe(false);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });
});
