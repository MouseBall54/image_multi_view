// @vitest-environment jsdom

import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RendererErrorBoundary } from "../components/RendererErrorBoundary";

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

const getByTestId = (host: HTMLElement, testId: string): HTMLElement | null => {
  return host.querySelector(`[data-testid="${testId}"]`);
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
  vi.restoreAllMocks();
});

describe("renderer crash containment", () => {
  it("shows a fallback and reports diagnostics when a child render throws", async () => {
    const reportRuntimeError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const ThrowingChild = (): React.ReactElement => {
      throw new Error("preview ui render exploded");
    };

    const { host } = await mount(
      React.createElement(
        RendererErrorBoundary,
        { onReportRuntimeError: reportRuntimeError },
        React.createElement(ThrowingChild)
      )
    );

    expect(getByTestId(host, "runtime-error-fallback")).not.toBeNull();
    expect(getByTestId(host, "runtime-error-message")?.textContent).toContain("preview ui render exploded");
    expect(reportRuntimeError).toHaveBeenCalledTimes(1);
    expect(reportRuntimeError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it("supports repeated failure and recovery via retry", async () => {
    let phase = 0;
    const reportRuntimeError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const FlakyChild = (): React.ReactElement => {
      if (phase === 0 || phase === 2) {
        throw new Error(`mode render failure phase-${phase}`);
      }
      return React.createElement("div", { "data-testid": "healthy-child" }, `healthy-${phase}`);
    };

    const createTree = (): React.ReactElement =>
      React.createElement(
        RendererErrorBoundary,
        { onReportRuntimeError: reportRuntimeError },
        React.createElement(FlakyChild)
      );

    const { host, root } = await mount(createTree());
    expect(getByTestId(host, "runtime-error-fallback")).not.toBeNull();
    expect(reportRuntimeError).toHaveBeenCalledTimes(1);

    phase = 1;
    await act(async () => {
      getByTestId(host, "runtime-error-retry")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(getByTestId(host, "healthy-child")?.textContent).toBe("healthy-1");

    phase = 2;
    await act(async () => {
      root.render(createTree());
    });
    expect(getByTestId(host, "runtime-error-fallback")).not.toBeNull();
    expect(reportRuntimeError).toHaveBeenCalledTimes(2);

    phase = 3;
    await act(async () => {
      getByTestId(host, "runtime-error-retry")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(getByTestId(host, "healthy-child")?.textContent).toBe("healthy-3");
  });
});
