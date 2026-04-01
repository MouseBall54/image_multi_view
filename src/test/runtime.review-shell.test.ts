// @vitest-environment jsdom

import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { useStore } from "../store";
import { createSyntheticFile } from "./runtimeTestHelpers";

vi.mock("../components/ReviewCanvas", () => ({
  ReviewCanvas: ({ reviewType }: { reviewType?: "detection" | "segmentation" }) => {
    return React.createElement("div", {
      "data-testid": `mock-review-canvas-${reviewType ?? "detection"}`
    });
  }
}));

vi.mock("../components/FilterCart", () => ({ FilterCart: () => null }));
vi.mock("../components/FilterPreviewModal", () => ({ FilterPreviewModal: () => null }));
vi.mock("../components/ToastContainer", () => ({ default: () => null }));
vi.mock("../components/ImageInfoPanel", () => ({ ImageInfoPanel: () => null }));
vi.mock("../components/AnalysisRotationControl", () => ({ AnalysisRotationControl: () => null }));
vi.mock("../components/CompareRotationControl", () => ({ CompareRotationControl: () => null }));
vi.mock("../components/PinpointGlobalRotationControl", () => ({ PinpointGlobalRotationControl: () => null }));
vi.mock("../components/PinpointGlobalScaleControl", () => ({ PinpointGlobalScaleControl: () => null }));
vi.mock("../components/ViewToggleControls", () => ({ ViewToggleControls: () => null }));
vi.mock("../components/LayoutGridSelector", () => ({ LayoutGridSelector: () => null }));
vi.mock("../components/ElectronUpdateManager", () => ({ default: () => null }));
vi.mock("../utils/opencv", () => ({
  initializeOpenCV: async () => undefined,
  getOpenCVInitState: () => ({ failed: false, error: null })
}));

vi.mock("../modes/CompareMode", () => ({
  CompareMode: React.forwardRef(() => React.createElement("main", { "data-testid": "mock-compare-mode" }))
}));

vi.mock("../modes/PinpointMode", () => ({
  PinpointMode: React.forwardRef(() => React.createElement("main", { "data-testid": "mock-pinpoint-mode" }))
}));

vi.mock("../modes/AnalysisMode", () => ({
  AnalysisMode: React.forwardRef(() => React.createElement("main", { "data-testid": "mock-analysis-mode" }))
}));

type MountedRoot = {
  host: HTMLDivElement;
  root: ReactDOM.Root;
};

const mountedRoots: MountedRoot[] = [];
const DEFAULT_VIEWER_ORDER = Array.from({ length: 26 }, (_, index) => index);

const resetState = () => {
  useStore.setState({
    appMode: "pinpoint",
    numViewers: 2,
    viewerRows: 1,
    viewerCols: 2,
    viewerOrder: [...DEFAULT_VIEWER_ORDER],
    folders: {},
    current: null,
    activeFilterEditor: null,
    selectedViewers: [],
    analysisFile: null,
    analysisFileSource: null,
    showFilelist: true,
    reviewType: "detection",
    selectedReviewItemId: null,
    reviewFileStatusFilter: "matched",
    reviewHasClassesMetadata: false,
    reviewWarningSummary: { matched: 0, unmatched: 0, invalid: 0, messages: [] }
  });
};

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

const flush = async (cycles = 2): Promise<void> => {
  for (let i = 0; i < cycles; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const assignInputFiles = (input: HTMLInputElement, files: File[], folderName: string) => {
  files.forEach((file) => {
    Object.defineProperty(file, "webkitRelativePath", {
      value: `${folderName}/${file.name}`,
      configurable: true
    });
  });

  const fileListLike = {
    item: (index: number) => files[index] ?? null
  } as { [index: number]: File; item: (index: number) => File | null; length: number };

  files.forEach((file, index) => {
    fileListLike[index] = file;
  });
  fileListLike.length = files.length;

  Object.defineProperty(input, "files", {
    value: fileListLike,
    configurable: true
  });
};

const enterReviewMode = async (host: HTMLDivElement) => {
  const modeSelect = host.querySelector('[data-testid="app-mode-select"]') as HTMLSelectElement;
  expect(modeSelect).not.toBeNull();

  await act(async () => {
    modeSelect.value = "compare";
    modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(useStore.getState().appMode).toBe("compare");

  await act(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "4", ctrlKey: true, bubbles: true }));
  });

  expect(useStore.getState().appMode).toBe("review");
  expect(host.querySelector('[data-testid="review-mode-root"]')).not.toBeNull();
};

const loadDetectionReviewDataset = async (host: HTMLDivElement, filenames: string[]) => {
  const imageInput = host.querySelector('[data-testid="review-images-input"]') as HTMLInputElement;
  const annotationInput = host.querySelector('[data-testid="review-annotations-input"]') as HTMLInputElement;

  assignInputFiles(imageInput, filenames.map((filename) => createSyntheticFile(filename, { type: "image/jpeg" })), "det-images");
  assignInputFiles(annotationInput, filenames.map((filename) => createSyntheticFile(filename.replace(/\.[^/.]+$/, ".txt"), { content: "0 0.5 0.5 0.2 0.2" })), "det-labels");

  await act(async () => {
    imageInput.dispatchEvent(new Event("change", { bubbles: true }));
    annotationInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await flush(3);
};

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
  resetState();
  vi.restoreAllMocks();
});

describe("runtime review shell integration", () => {
  it("keeps review reachable and covers detection+segmentation review happy paths", async () => {
    resetState();
    const { host } = await mount(React.createElement(App));

    const modeSelect = host.querySelector('[data-testid="app-mode-select"]') as HTMLSelectElement;
    expect(modeSelect).not.toBeNull();
    expect(host.querySelector('[data-testid="mode-option-review"]')).not.toBeNull();

    await act(async () => {
      modeSelect.value = "compare";
      modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(useStore.getState().appMode).toBe("compare");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "4", ctrlKey: true, bubbles: true }));
    });

    expect(useStore.getState().appMode).toBe("review");
    expect(host.querySelector('[data-testid="review-mode-root"]')).not.toBeNull();

    expect(host.querySelector(".toggle-main-btn")).toBeNull();
    expect(host.querySelector(".capture-button")).toBeNull();
    expect(host.querySelector(".minimap-button-unified")).not.toBeNull();
    expect(host.querySelector(".grid-button-unified")).toBeNull();
    expect(host.querySelector(".sync-button")).toBeNull();

    expect(useStore.getState().showMinimap).toBe(false);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "m", altKey: true, bubbles: true }));
    });
    expect(useStore.getState().showMinimap).toBe(true);

    const gridBefore = useStore.getState().showGrid;
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "g", altKey: true, bubbles: true }));
    });
    expect(useStore.getState().showGrid).toBe(gridBefore);

    const labelsBefore = useStore.getState().showFilterLabels;
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "l", ctrlKey: true, bubbles: true }));
    });
    expect(useStore.getState().showFilterLabels).toBe(labelsBefore);

    const imageInput = host.querySelector('[data-testid="review-images-input"]') as HTMLInputElement;
    const annotationInput = host.querySelector('[data-testid="review-annotations-input"]') as HTMLInputElement;

    assignInputFiles(imageInput, [
      createSyntheticFile("det-1.jpg", { type: "image/jpeg" })
    ], "det-images");

    assignInputFiles(annotationInput, [
      createSyntheticFile("det-1.txt", { content: "0 0.5 0.5 0.2 0.2" })
    ], "det-labels");

    await act(async () => {
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      annotationInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush(3);

    expect(host.querySelector('[data-testid="review-selected-filename"]')?.textContent).toContain("det-1.jpg");
    expect(host.querySelector('[data-testid="review-detection-summary"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="mock-review-canvas-detection"]')).not.toBeNull();

    const reviewTypeSelect = host.querySelector('[data-testid="review-type-select"]') as HTMLSelectElement;
    await act(async () => {
      reviewTypeSelect.value = "segmentation";
      reviewTypeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    assignInputFiles(imageInput, [
      createSyntheticFile("seg-1.png", { type: "image/png" })
    ], "seg-images");

    assignInputFiles(annotationInput, [
      createSyntheticFile("seg-1.png", { type: "image/png", lastModified: 1 })
    ], "seg-masks");

    const originalCreateImageBitmap = globalThis.createImageBitmap;
    (globalThis as any).createImageBitmap = async () => ({ width: 8, height: 8, close: () => undefined });

    await act(async () => {
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      annotationInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush(3);

    expect(host.querySelector('[data-testid="review-selected-filename"]')?.textContent).toContain("seg-1.png");
    expect(host.querySelector('[data-testid="mock-review-canvas-segmentation"]')).not.toBeNull();

    (globalThis as any).createImageBitmap = originalCreateImageBitmap;
  });

  it("supports review keyboard traversal without navigating from editable controls", async () => {
    resetState();
    const { host } = await mount(React.createElement(App));

    await enterReviewMode(host);
    await loadDetectionReviewDataset(host, ["det-1.jpg", "det-2.jpg", "det-3.jpg"]);

    const selectedFilename = () => host.querySelector('[data-testid="review-selected-filename"]')?.textContent ?? "";
    const prevButton = () => host.querySelector('[data-testid="review-prev-item"]') as HTMLButtonElement;
    const nextButton = () => host.querySelector('[data-testid="review-next-item"]') as HTMLButtonElement;

    expect(selectedFilename()).toContain("det-1.jpg");
    expect(prevButton().disabled).toBe(true);
    expect(nextButton().disabled).toBe(false);

    await act(async () => {
      nextButton().click();
    });
    expect(selectedFilename()).toContain("det-2.jpg");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(selectedFilename()).toContain("det-3.jpg");
    expect(prevButton().disabled).toBe(false);
    expect(nextButton().disabled).toBe(true);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(selectedFilename()).toContain("det-3.jpg");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    expect(selectedFilename()).toContain("det-2.jpg");

    const searchInput = host.querySelector('.review-filelist input[type="text"]') as HTMLInputElement;
    await act(async () => {
      searchInput.focus();
      searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(selectedFilename()).toContain("det-2.jpg");

    const reviewTypeSelect = host.querySelector('[data-testid="review-type-select"]') as HTMLSelectElement;
    await act(async () => {
      reviewTypeSelect.focus();
      reviewTypeSelect.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(selectedFilename()).toContain("det-2.jpg");

    const textarea = document.createElement("textarea");
    host.appendChild(textarea);
    await act(async () => {
      textarea.focus();
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(selectedFilename()).toContain("det-2.jpg");

    const contentEditable = document.createElement("div");
    contentEditable.setAttribute("contenteditable", "true");
    host.appendChild(contentEditable);
    await act(async () => {
      contentEditable.focus();
      contentEditable.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(selectedFilename()).toContain("det-2.jpg");
  });

  it("clears leaked dragging lock so review rail controls remain interactive", async () => {
    resetState();
    const { host } = await mount(React.createElement(App));

    document.body.classList.add("viewer-dragging");
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    await enterReviewMode(host);

    expect(document.body.classList.contains("viewer-dragging")).toBe(false);
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");

    await loadDetectionReviewDataset(host, ["det-1.jpg", "det-2.jpg"]);

    expect(host.querySelector('[data-testid="review-detail-rail"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="review-detection-summary"]')).not.toBeNull();

    const selectedFilename = () => host.querySelector('[data-testid="review-selected-filename"]')?.textContent ?? "";
    const nextButton = host.querySelector('[data-testid="review-next-item"]') as HTMLButtonElement;

    expect(selectedFilename()).toContain("det-1.jpg");
    await act(async () => {
      nextButton.click();
    });
    expect(selectedFilename()).toContain("det-2.jpg");
  });
});
