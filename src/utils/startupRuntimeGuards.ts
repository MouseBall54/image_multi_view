type StartupWarningToast = {
  type: "warning";
  title: string;
  message: string;
  details?: string[];
  duration?: number;
};

type StartupWarningLogger = {
  warn: (...args: unknown[]) => void;
};

type ReporterOptions = {
  code: string;
  title?: string;
  message: string;
  details?: string[];
  addToast?: ((toast: StartupWarningToast) => void) | undefined;
  logger?: StartupWarningLogger;
};

const reportedWarningCodes = new Set<string>();

const isFunction = (value: unknown): value is (...args: unknown[]) => unknown => {
  return typeof value === "function";
};

type BridgeShape = {
  watchFolder?: {
    add?: unknown;
    remove?: unknown;
    onChange?: unknown;
    removeAllListeners?: unknown;
  };
  updater?: {
    checkForUpdates?: unknown;
    getVersion?: unknown;
  };
  windowActions?: {
    toggleDevTools?: unknown;
    reload?: unknown;
  };
};

export type ElectronStartupCapabilities = {
  bridgeAvailable: boolean;
  watcherAvailable: boolean;
  updaterAvailable: boolean;
  canToggleDevTools: boolean;
  shouldWarn: boolean;
  warningMessage?: string;
  warningDetails: string[];
};

export const shouldExpectElectronRuntime = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /\bElectron\//.test(navigator.userAgent);
};

export const evaluateElectronStartupCapabilities = (
  electronAPI: unknown,
  options: { expectElectronRuntime?: boolean } = {}
): ElectronStartupCapabilities => {
  const expectElectronRuntime = options.expectElectronRuntime ?? shouldExpectElectronRuntime();
  const bridge = (electronAPI && typeof electronAPI === "object"
    ? (electronAPI as BridgeShape)
    : null);

  const bridgeAvailable = Boolean(bridge);
  const watcherAvailable = Boolean(
    bridge &&
    isFunction(bridge.watchFolder?.add) &&
    isFunction(bridge.watchFolder?.remove) &&
    isFunction(bridge.watchFolder?.onChange)
  );
  const updaterAvailable = Boolean(
    bridge &&
    isFunction(bridge.updater?.checkForUpdates) &&
    isFunction(bridge.updater?.getVersion) &&
    isFunction((bridge.updater as any)?.onUpdateChecking) &&
    isFunction((bridge.updater as any)?.onUpdateAvailable) &&
    isFunction((bridge.updater as any)?.onUpdateNotAvailable) &&
    isFunction((bridge.updater as any)?.onUpdateError) &&
    isFunction((bridge.updater as any)?.onDownloadProgress) &&
    isFunction((bridge.updater as any)?.onUpdateDownloaded)
  );
  const canToggleDevTools = Boolean(bridge && isFunction(bridge.windowActions?.toggleDevTools));

  const warningDetails: string[] = [];

  if (!bridgeAvailable && expectElectronRuntime) {
    warningDetails.push("Electron preload bridge (window.electronAPI) is missing.");
  }

  if (bridgeAvailable && !watcherAvailable) {
    warningDetails.push("Watcher IPC bridge is unavailable (watchFolder.add/remove/onChange).");
  }

  if (bridgeAvailable && !updaterAvailable) {
    warningDetails.push("Updater IPC bridge is unavailable (checkForUpdates/getVersion/event listeners).");
  }

  const shouldWarn = warningDetails.length > 0;
  const warningMessage = shouldWarn
    ? "Desktop integrations are partially unavailable. compareX will continue in degraded mode."
    : undefined;

  return {
    bridgeAvailable,
    watcherAvailable,
    updaterAvailable,
    canToggleDevTools,
    shouldWarn,
    warningMessage,
    warningDetails
  };
};

export const reportStartupWarningOnce = ({
  code,
  title,
  message,
  details,
  addToast,
  logger
}: ReporterOptions): boolean => {
  if (reportedWarningCodes.has(code)) {
    return false;
  }

  reportedWarningCodes.add(code);
  const warningLogger = logger ?? console;
  warningLogger.warn(`[startup-guard:${code}] ${message}`, details ?? []);

  addToast?.({
    type: "warning",
    title: title ?? "Runtime Guard",
    message,
    details,
    duration: 5000
  });

  return true;
};

export const resetStartupWarningStateForTests = (): void => {
  reportedWarningCodes.clear();
};
