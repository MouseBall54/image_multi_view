import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  evaluateElectronStartupCapabilities,
  reportStartupWarningOnce,
  resetStartupWarningStateForTests
} from "../utils/startupRuntimeGuards";

describe("runtime startup guards", () => {
  beforeEach(() => {
    resetStartupWarningStateForTests();
    vi.restoreAllMocks();
  });

  it("degrades safely when Electron preload bridge is missing", () => {
    const capabilities = evaluateElectronStartupCapabilities(undefined, {
      expectElectronRuntime: true
    });

    expect(capabilities.bridgeAvailable).toBe(false);
    expect(capabilities.watcherAvailable).toBe(false);
    expect(capabilities.updaterAvailable).toBe(false);
    expect(capabilities.shouldWarn).toBe(true);
    expect(capabilities.warningDetails).toContain(
      "Electron preload bridge (window.electronAPI) is missing."
    );
  });

  it("reports startup warning through one clear path only once", () => {
    const warn = vi.fn();
    const addToast = vi.fn();

    const first = reportStartupWarningOnce({
      code: "runtime-degraded",
      message: "Runtime degraded",
      details: ["detail"],
      logger: { warn },
      addToast
    });

    const second = reportStartupWarningOnce({
      code: "runtime-degraded",
      message: "Runtime degraded",
      details: ["detail"],
      logger: { warn },
      addToast
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledTimes(1);
  });

  it("falls back safely when OpenCV initialization is unavailable", async () => {
    vi.resetModules();
    vi.doMock("opencv-ts", () => ({
      default: {
        ready: Promise.reject(new Error("opencv init failed"))
      }
    }));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const opencv = await import("../utils/opencv");

    await expect(opencv.initializeOpenCV()).resolves.toBeUndefined();
    const failedState = opencv.getOpenCVInitState();
    expect(failedState.failed).toBe(true);
    expect(failedState.ready).toBe(false);
    expect(opencv.isOpenCVReady()).toBe(false);

    await expect(opencv.initializeOpenCV()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
