import appPackageJson from "../../package.json";
import { BuildChannel, getBuildChannel } from "./environment";

export type UsageLogDetails = Record<string, unknown>;

export type UsageLogResult = {
  success: boolean;
  error?: string;
  status?: number;
  statusText?: string;
};

export const UsageLogEvent = {
  APP_LAUNCH: "app_launch",
  APP_READY: "app_ready",
  UPDATE_CHECK_REQUESTED: "update_check_requested",
  UPDATE_AVAILABLE: "update_available",
  UPDATE_NOT_AVAILABLE: "update_not_available",
  UPDATE_ERROR: "update_error",
  UPDATE_DOWNLOAD_REQUESTED: "update_download_requested",
  UPDATE_DOWNLOAD_COMPLETED: "update_download_completed",
  UPDATE_INSTALL_REQUESTED: "update_install_requested"
} as const;

export type UsageLogEventName = (typeof UsageLogEvent)[keyof typeof UsageLogEvent];

type UsageLoggingConfig = {
  endpoint?: string;
};

type PackageJson = {
  usageLogging?: Partial<
    Record<BuildChannel | "default", UsageLoggingConfig>
  >;
};

const FALLBACK_ENDPOINTS: Record<BuildChannel, string> = {
  dev: "http://localhost:8000/api/logs",
  prod: "http://localhost:8000/api/logs"
};

const pkg = appPackageJson as PackageJson;
const usageLoggingTargets = pkg.usageLogging ?? {};
const warnedEndpoints = new Set<string>();

const isTruthy = (value?: string): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

const isLoopbackEndpoint = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
};

const normalizeEndpoint = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readEnvValue = (key: string): string | undefined => {
  try {
    const metaEnv = (import.meta as unknown as {
      env?: Record<string, string | undefined>;
    }).env;
    if (metaEnv && typeof metaEnv[key] === "string") {
      return metaEnv[key];
    }
  } catch {
    // ignore
  }

  if (typeof process !== "undefined" && process.env && typeof process.env[key] === "string") {
    return process.env[key];
  }

  return undefined;
};

export const getUsageLoggingEndpoint = (
  channel: BuildChannel = getBuildChannel()
): string => {
  const envKey = `VITE_USAGE_LOG_ENDPOINT_${channel.toUpperCase()}`;
  const viaEnv =
    normalizeEndpoint(readEnvValue(envKey)) ??
    normalizeEndpoint(readEnvValue("VITE_USAGE_LOG_ENDPOINT"));

  if (viaEnv) {
    return viaEnv;
  }

  const fromPackage =
    normalizeEndpoint(usageLoggingTargets?.[channel]?.endpoint) ??
    normalizeEndpoint(usageLoggingTargets?.default?.endpoint) ??
    normalizeEndpoint(usageLoggingTargets?.prod?.endpoint) ??
    normalizeEndpoint(usageLoggingTargets?.dev?.endpoint);

  if (fromPackage) {
    return fromPackage;
  }

  return FALLBACK_ENDPOINTS[channel];
};

const buildClientContext = (): Record<string, unknown> => {
  if (typeof window === "undefined") {
    return {};
  }

  const viewport =
    typeof window.innerWidth === "number" && typeof window.innerHeight === "number"
      ? { width: window.innerWidth, height: window.innerHeight }
      : undefined;

  const hasNavigator = typeof navigator !== "undefined";
  const resolvedTimezone =
    typeof Intl !== "undefined" && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;

  return {
    href: window.location?.href,
    viewport,
    isElectron: Boolean(window.electronAPI),
    language: hasNavigator ? navigator.language : undefined,
    languages: hasNavigator ? navigator.languages : undefined,
    platform: hasNavigator ? navigator.platform : undefined,
    userAgent: hasNavigator ? navigator.userAgent : undefined,
    timezone: resolvedTimezone,
    online: hasNavigator ? navigator.onLine : undefined
  };
};

export const logUsageEvent = async (
  eventType: UsageLogEventName,
  details?: UsageLogDetails
): Promise<UsageLogResult> => {
  const channel = getBuildChannel();
  const context = buildClientContext();

  if (typeof window !== "undefined" && window.electronAPI?.logUsageEvent) {
    return window.electronAPI.logUsageEvent(eventType, details, context);
  }

  const endpoint = getUsageLoggingEndpoint(channel);
  if (!endpoint) {
    return { success: false, error: "Usage logging endpoint not configured" };
  }

  const enableDevWebUsageLogging = isTruthy(readEnvValue("VITE_ENABLE_DEV_USAGE_LOGGING"));
  const isWebRuntime = typeof window !== "undefined" && !window.electronAPI;
  if (channel === "dev" && isWebRuntime && isLoopbackEndpoint(endpoint) && !enableDevWebUsageLogging) {
    return { success: false, error: "Usage logging disabled for dev web runtime" };
  }

  if (typeof fetch !== "function") {
    return { success: false, error: "Fetch API not available" };
  }

  const payload = {
    eventType,
    timestamp: new Date().toISOString(),
    channel,
    details,
    clientContext: context
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    if (!warnedEndpoints.has(endpoint)) {
      warnedEndpoints.add(endpoint);
      const message = error instanceof Error ? error.message : "Unknown logging error";
      console.warn(`Usage logging unavailable for endpoint ${endpoint}: ${message}`);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown logging error"
    };
  }
};
