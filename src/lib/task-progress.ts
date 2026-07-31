import { supabase } from "@/integrations/supabase/client";

export type ProgressRow = {
  task_id: string;
  score: number;
  xp_awarded: number;
  completed_at: string;
  user_id?: string;
};

type SaveInput = {
  userId: string;
  taskId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  xpAwarded: number;
  answers: unknown;
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

export async function fetchTaskProgress(userId: string): Promise<ProgressRow[]> {
  const { data, error } = await supabase
    .from("task_progress")
    .select("task_id, score, xp_awarded, completed_at, user_id")
    .eq("user_id", userId);

  if (!error && data) return data as ProgressRow[];

  // Table may not be migrated yet — fall back to local progress.
  console.warn("[task_progress] using local fallback:", error?.message);
  return readLocal(userId);
}

export async function fetchAllTaskProgress(): Promise<ProgressRow[]> {
  const { data, error } = await supabase
    .from("task_progress")
    .select("task_id, score, xp_awarded, completed_at, user_id");

  if (!error && data) return data as ProgressRow[];
  console.warn("[task_progress] parent view local-limited:", error?.message);
  return [];
}

export async function saveTaskProgress(input: SaveInput): Promise<{ awarded: number; already: boolean }> {
  const existingRemote = await supabase
    .from("task_progress")
    .select("id")
    .eq("user_id", input.userId)
    .eq("task_id", input.taskId)
    .maybeSingle();

  if (existingRemote.data) return { awarded: 0, already: true };

  const local = readLocal(input.userId);
  if (local.some((r) => r.task_id === input.taskId)) {
    return { awarded: 0, already: true };
  }

  const row = {
    user_id: input.userId,
    task_id: input.taskId,
    score: input.score,
    correct_count: input.correctCount,
    total_count: input.totalCount,
    xp_awarded: input.xpAwarded,
    answers: input.answers as never,
  };

  const { error } = await supabase.from("task_progress").insert(row);
  if (error) {
    console.warn("[task_progress] insert failed, saving locally:", error.message);
    writeLocal(input.userId, [
      ...local,
      {
        task_id: input.taskId,
        score: input.score,
        xp_awarded: input.xpAwarded,
        completed_at: new Date().toISOString(),
        user_id: input.userId,
      },
    ]);
  }

  return { awarded: input.xpAwarded, already: false };
}
