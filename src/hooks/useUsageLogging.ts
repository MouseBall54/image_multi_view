import { useEffect } from "react";
import { logUsageEvent, UsageLogEvent } from "../utils/usageLogger";

export const useUsageLogging = (): void => {
  useEffect(() => {
    const details = {
      href: typeof window !== "undefined" ? window.location.href : undefined
    };
    void logUsageEvent(UsageLogEvent.APP_LAUNCH, details);
  }, []);
};
