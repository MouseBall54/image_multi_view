import appPackageJson from "../../package.json";
import { getBuildChannel } from "./environment";

export type UpdateFeedTarget = "dev" | "prod";

type DeployTargetConfig = {
  serverUrl?: string;
};

type PackageJson = {
  deployTargets?: Partial<Record<UpdateFeedTarget, DeployTargetConfig>>;
  build?: {
    publish?:
      | undefined
      | null
      | { url?: string }
      | Array<{ url?: string } | null | undefined>;
  };
};

const FALLBACK_FEEDS: Record<UpdateFeedTarget, string> = {
  dev: "http://localhost:8000/updates/",
  prod: "http://localhost:8000/updates/"
};

const pkg = appPackageJson as PackageJson;
const deployTargets = pkg.deployTargets ?? {};

const publishUrl = (() => {
  const publish = pkg.build?.publish;
  if (!publish) return undefined;
  if (Array.isArray(publish)) {
    return publish.find((entry) => entry && entry.url)?.url;
  }
  return publish.url;
})();

const PACKAGE_FEEDS: Partial<Record<UpdateFeedTarget, string>> = {
    dev: deployTargets.dev?.serverUrl,
    prod: deployTargets.prod?.serverUrl ?? publishUrl
};

const normalizeFeedUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

const readEnvValue = (key: string): string | undefined => {
  try {
    const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (meta && typeof meta[key] === "string") {
      return meta[key];
    }
  } catch {
    // ignore
  }

  if (typeof process !== "undefined" && process.env && typeof process.env[key] === "string") {
    return process.env[key];
  }

  return undefined;
};

export const getUpdateFeedUrl = (target: UpdateFeedTarget): string => {
  const envKey = `VITE_UPDATE_FEED_${target.toUpperCase()}`;
  const envValue = normalizeFeedUrl(readEnvValue(envKey));
  if (envValue) {
    return envValue;
  }

  const packageUrl = normalizeFeedUrl(PACKAGE_FEEDS[target]);
  if (packageUrl) {
    return packageUrl;
  }

  return FALLBACK_FEEDS[target];
};

export const getDefaultUpdateFeedTarget = (): UpdateFeedTarget => {
  return getBuildChannel() === "prod" ? "prod" : "dev";
};

export const configureUpdaterFeed = async (target: UpdateFeedTarget): Promise<string | null> => {
  if (typeof window === "undefined" || !window.electronAPI?.updater?.setFeedURL) {
    return null;
  }
  const url = getUpdateFeedUrl(target);
  const result = await window.electronAPI.updater.setFeedURL(url);
  if (result && "error" in result && result.error) {
    throw new Error(result.error);
  }
  return url;
};
