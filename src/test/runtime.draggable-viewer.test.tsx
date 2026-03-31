// @vitest-environment jsdom

import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DraggableViewer } from "../components/DraggableViewer";

type MountedRoot = {
  host: HTMLDivElement;
  root: ReactDOM.Root;
};

const mountedRoots: MountedRoot[] = [];

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

  document.body.classList.remove("viewer-dragging");
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  vi.restoreAllMocks();
});

describe("runtime draggable viewer cleanup", () => {
  it("clears leaked global dragging body state on unmount", async () => {
    const onReorder = vi.fn();
    const { host, root } = await mount(
      <DraggableViewer position={0} onReorder={onReorder}>
        <div data-testid="draggable-child">child</div>
      </DraggableViewer>
    );

    const dragElement = host.querySelector(".draggable-viewer") as HTMLDivElement;
    expect(dragElement).not.toBeNull();

    await act(async () => {
      dragElement.dispatchEvent(new MouseEvent("mousedown", {
        bubbles: true,
        shiftKey: true,
        clientX: 10,
        clientY: 10
      }));
    });

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 40,
        clientY: 40
      }));
    });

    expect(document.body.classList.contains("viewer-dragging")).toBe(true);
    expect(document.body.style.cursor).toBe("grabbing");
    expect(document.body.style.userSelect).toBe("none");

    await act(async () => {
      root.unmount();
    });

    expect(document.body.classList.contains("viewer-dragging")).toBe(false);
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 80,
        clientY: 80
      }));
    });

    expect(document.body.classList.contains("viewer-dragging")).toBe(false);
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });
});
