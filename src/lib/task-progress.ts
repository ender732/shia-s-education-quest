import { supabase } from "@/integrations/supabase/client";

/** Score at or above this counts as lesson mastery (XP eligible once). */
export const MASTERY_SCORE_MIN = 70;
/** Students can keep retrying until they reach this. */
export const PERFECT_SCORE = 100;

export type ProgressRow = {
  task_id: string;
  score: number;
  xp_awarded: number;
  completed_at: string;
  user_id?: string;
  attempt_count?: number;
  last_attempt_at?: string;
};

type SaveInput = {
  userId: string;
  taskId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  /** XP to grant on first mastery only (score ≥ MASTERY_SCORE_MIN). */
  xpAwarded: number;
  answers: unknown;
};

export type SaveProgressResult = {
  awarded: number;
  alreadyAwardedXp: boolean;
  attemptCount: number;
  bestScore: number;
  isPerfect: boolean;
  isMastered: boolean;
  improved: boolean;
};

function localKey(userId: string) {
  return `hqc_task_progress_${userId}`;
}

function readLocal(userId: string): ProgressRow[] {
  try {
    const raw = localStorage.getItem(localKey(userId));
    return raw ? (JSON.parse(raw) as ProgressRow[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(userId: string, rows: ProgressRow[]) {
  localStorage.setItem(localKey(userId), JSON.stringify(rows));
}

function mirrorLocal(userId: string, row: ProgressRow) {
  const local = readLocal(userId).filter((r) => r.task_id !== row.task_id);
  writeLocal(userId, [...local, row]);
}

export function isMasteredScore(score: number | null | undefined): boolean {
  return (score ?? 0) >= MASTERY_SCORE_MIN;
}

export function isPerfectScore(score: number | null | undefined): boolean {
  return (score ?? 0) >= PERFECT_SCORE;
}

export function canRetryForPerfect(score: number | null | undefined): boolean {
  return isMasteredScore(score) && !isPerfectScore(score);
}

export async function fetchTaskProgress(userId: string): Promise<ProgressRow[]> {
  const { data, error } = await supabase
    .from("task_progress")
    .select(
      "task_id, score, xp_awarded, completed_at, user_id, attempt_count, last_attempt_at",
    )
    .eq("user_id", userId);

  if (!error && data) return data as ProgressRow[];

  console.warn("[task_progress] using local fallback:", error?.message);
  return readLocal(userId);
}

/** Fetch progress for specific linked students only (empty ids → empty result). */
export async function fetchTaskProgressForStudents(
  studentIds: string[],
): Promise<ProgressRow[]> {
  if (studentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("task_progress")
    .select(
      "task_id, score, xp_awarded, completed_at, user_id, attempt_count, last_attempt_at",
    )
    .in("user_id", studentIds);

  if (error) throw error;
  return (data ?? []) as ProgressRow[];
}

/** @deprecated Prefer fetchTaskProgressForStudents — global parent reads are no longer allowed. */
export async function fetchAllTaskProgress(): Promise<ProgressRow[]> {
  return fetchTaskProgressForStudents([]);
}

/**
 * Record a scored attempt. Always increments attempt_count.
 * Keeps the best score. Awards XP only on the first mastery (≥ 70%).
 */
export async function saveTaskProgress(
  input: SaveInput,
): Promise<SaveProgressResult> {
  const now = new Date().toISOString();
  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  const qualifiesForXp = score >= MASTERY_SCORE_MIN && input.xpAwarded > 0;

  const existingRemote = await supabase
    .from("task_progress")
    .select(
      "id, score, xp_awarded, attempt_count, correct_count, total_count, answers, completed_at",
    )
    .eq("user_id", input.userId)
    .eq("task_id", input.taskId)
    .maybeSingle();

  if (existingRemote.error) {
    console.warn("[task_progress] select failed:", existingRemote.error.message);
  }

  const existing = existingRemote.data as
    | {
        id: string;
        score: number;
        xp_awarded: number;
        attempt_count: number | null;
        correct_count: number;
        total_count: number;
        answers: unknown;
        completed_at: string;
      }
    | null
    | undefined;

  if (existing) {
    const attemptCount = Math.max(1, existing.attempt_count ?? 1) + 1;
    const bestScore = Math.max(existing.score, score);
    const improved = score > existing.score;
    const alreadyAwardedXp = existing.xp_awarded > 0;
    const awardNow = !alreadyAwardedXp && qualifiesForXp ? input.xpAwarded : 0;
    const xpTotal = alreadyAwardedXp ? existing.xp_awarded : awardNow;

    const { error } = await supabase
      .from("task_progress")
      .update({
        score: bestScore,
        correct_count: improved ? input.correctCount : existing.correct_count,
        total_count: improved ? input.totalCount : existing.total_count,
        answers: (improved ? input.answers : existing.answers) as never,
        xp_awarded: xpTotal,
        attempt_count: attemptCount,
        last_attempt_at: now,
      })
      .eq("id", existing.id);

    if (error) {
      console.warn("[task_progress] update failed:", error.message);
      throw new Error(
        error.message ||
          "Could not save lesson progress. Check your connection and try again.",
      );
    }

    mirrorLocal(input.userId, {
      task_id: input.taskId,
      score: bestScore,
      xp_awarded: xpTotal,
      completed_at: existing.completed_at,
      user_id: input.userId,
      attempt_count: attemptCount,
      last_attempt_at: now,
    });

    return {
      awarded: awardNow,
      alreadyAwardedXp: alreadyAwardedXp || awardNow > 0,
      attemptCount,
      bestScore,
      isPerfect: bestScore >= PERFECT_SCORE,
      isMastered: bestScore >= MASTERY_SCORE_MIN,
      improved,
    };
  }

  const awardNow = qualifiesForXp ? input.xpAwarded : 0;
  const row = {
    user_id: input.userId,
    task_id: input.taskId,
    score,
    correct_count: input.correctCount,
    total_count: input.totalCount,
    xp_awarded: awardNow,
    answers: input.answers as never,
    attempt_count: 1,
    last_attempt_at: now,
  };

  const { error } = await supabase.from("task_progress").insert(row);
  if (error) {
    console.warn("[task_progress] insert failed:", error.message);
    throw new Error(
      error.message ||
        "Could not save lesson progress. Check your connection and try again.",
    );
  }

  mirrorLocal(input.userId, {
    task_id: input.taskId,
    score,
    xp_awarded: awardNow,
    completed_at: now,
    user_id: input.userId,
    attempt_count: 1,
    last_attempt_at: now,
  });

  return {
    awarded: awardNow,
    alreadyAwardedXp: awardNow > 0,
    attemptCount: 1,
    bestScore: score,
    isPerfect: score >= PERFECT_SCORE,
    isMastered: score >= MASTERY_SCORE_MIN,
    improved: true,
  };
}
