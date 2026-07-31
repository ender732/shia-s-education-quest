import { useEffect, useEffectEvent, useRef } from "react";
import { getTodayEtDateString, upsertDailySeconds } from "@/lib/daily-activity";

const FLUSH_INTERVAL_MS = 20_000;

/**
 * Accumulates active lesson time (teach + quiz) while the tab is visible,
 * flushing to daily_activity every ~20s and on unmount / disable.
 */
export function useDailyActivityTracker({
  enabled,
  taskId,
  subjectId,
}: {
  enabled: boolean;
  taskId: string;
  subjectId?: string | null;
}) {
  const pendingRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const dayRef = useRef(getTodayEtDateString());

  const flush = useEffectEvent(async (force = false) => {
    const secs = Math.floor(pendingRef.current);
    if (secs <= 0 && !force) return;
    if (secs <= 0) return;

    pendingRef.current -= secs;
    const day = dayRef.current;
    const result = await upsertDailySeconds({
      taskId,
      seconds: secs,
      subjectId,
      activityDate: day,
    });
    if (!result.ok && !result.unavailable) {
      pendingRef.current += secs;
    }
  });

  useEffect(() => {
    if (!enabled) return;

    dayRef.current = getTodayEtDateString();
    lastTickRef.current = document.visibilityState === "visible" ? Date.now() : null;

    const tick = () => {
      const today = getTodayEtDateString();
      if (today !== dayRef.current) {
        // Midnight ET crossed — flush old day, start new challenge day.
        void flush();
        dayRef.current = today;
      }

      if (document.visibilityState !== "visible") {
        lastTickRef.current = null;
        return;
      }

      const now = Date.now();
      if (lastTickRef.current != null) {
        pendingRef.current += (now - lastTickRef.current) / 1000;
      }
      lastTickRef.current = now;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastTickRef.current = Date.now();
      } else {
        tick();
        lastTickRef.current = null;
        void flush();
      }
    };

    const interval = window.setInterval(() => {
      tick();
      void flush();
    }, FLUSH_INTERVAL_MS);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      tick();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
      void flush(true);
    };
  }, [enabled, taskId, subjectId]);
}
