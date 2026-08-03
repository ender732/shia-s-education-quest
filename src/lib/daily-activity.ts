import { supabase } from "@/integrations/supabase/client";

const ET = "America/New_York";

/** Calendar date string (YYYY-MM-DD) in America/New_York. */
export function getTodayEtDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Format seconds as H:MM:SS (always) or “Xh Ym Zs” when friendly. */
export function formatDuration(totalSeconds: number, style: "clock" | "friendly" = "clock"): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (style === "friendly") {
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Split seconds into h/m/s plus the catalog key that fits, so the UI can render
 * a localized "friendly" duration instead of hardcoded h/m/s suffixes.
 */
export function durationParts(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
  key: "hours" | "minutes" | "seconds";
} {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const key = hours > 0 ? "hours" : minutes > 0 ? "minutes" : "seconds";
  return { hours, minutes, seconds, key };
}

export type DailyLeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  total_seconds: number;
  best_score: number | null;
};

export const DAILY_LEADERBOARD_QUERY_KEY = "daily_leaderboard";

export function isMissingDailyActivityError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    msg.includes("daily_activity") ||
    msg.includes("get_daily_leaderboard") ||
    msg.includes("upsert_daily_seconds") ||
    msg.includes("upsert_daily_score") ||
    msg.includes("could not find the function") ||
    msg.includes("does not exist")
  );
}

export async function fetchDailyLeaderboard(
  day: string = getTodayEtDateString(),
): Promise<{ rows: DailyLeaderboardRow[]; unavailable: boolean }> {
  const { data, error } = await supabase.rpc("get_daily_leaderboard", { _day: day });

  if (error) {
    if (isMissingDailyActivityError(error)) {
      console.warn("[daily_activity] leaderboard unavailable:", error.message);
      return { rows: [], unavailable: true };
    }
    throw error;
  }

  const rows = ((data ?? []) as Array<{
    rank: number | string;
    user_id: string;
    display_name: string;
    total_seconds: number | string;
    best_score: number | null;
  }>).map((r) => ({
    rank: Number(r.rank),
    user_id: r.user_id,
    display_name: r.display_name,
    total_seconds: Number(r.total_seconds),
    best_score: r.best_score,
  }));

  return { rows, unavailable: false };
}

export async function upsertDailySeconds(input: {
  taskId: string;
  seconds: number;
  subjectId?: string | null;
  activityDate?: string;
}): Promise<{ ok: boolean; unavailable?: boolean }> {
  if (input.seconds <= 0) return { ok: true };

  const { error } = await supabase.rpc("upsert_daily_seconds", {
    _task_id: input.taskId,
    _seconds: Math.round(input.seconds),
    _subject_id: input.subjectId ?? null,
    _activity_date: input.activityDate ?? getTodayEtDateString(),
  });

  if (error) {
    if (isMissingDailyActivityError(error)) {
      console.warn("[daily_activity] upsert seconds skipped:", error.message);
      return { ok: false, unavailable: true };
    }
    console.warn("[daily_activity] upsert seconds failed:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

export async function upsertDailyScore(input: {
  taskId: string;
  score: number;
  subjectId?: string | null;
  activityDate?: string;
}): Promise<{ ok: boolean; unavailable?: boolean }> {
  const score = Math.max(0, Math.min(100, Math.round(input.score)));

  const { error } = await supabase.rpc("upsert_daily_score", {
    _task_id: input.taskId,
    _score: score,
    _subject_id: input.subjectId ?? null,
    _activity_date: input.activityDate ?? getTodayEtDateString(),
  });

  if (error) {
    if (isMissingDailyActivityError(error)) {
      console.warn("[daily_activity] upsert score skipped:", error.message);
      return { ok: false, unavailable: true };
    }
    console.warn("[daily_activity] upsert score failed:", error.message);
    return { ok: false };
  }
  return { ok: true };
}
