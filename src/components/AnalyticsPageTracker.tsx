import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";

/** Fires first-party page_view on client navigations (pathname + search). */
export function AnalyticsPageTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });

  useEffect(() => {
    const path = `${pathname}${search || ""}`;
    void trackPageView(path);
  }, [pathname, search]);

  return null;
}
