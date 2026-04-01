import { useEffect, useRef } from "react";
import { logUsageEvent, UsageLogEvent } from "../utils/usageLogger";

export const useUsageLogging = (): void => {
  const hasLoggedAppLaunch = useRef(false);

  useEffect(() => {
    if (hasLoggedAppLaunch.current) {
      return;
    }
    hasLoggedAppLaunch.current = true;

    const details = {
      href: typeof window !== "undefined" ? window.location.href : undefined
    };
    void logUsageEvent(UsageLogEvent.APP_LAUNCH, details);
  }, []);
};
