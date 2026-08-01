import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  Tag,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { LessonPractice } from "@/components/LessonPractice";
import { HowToContextual } from "@/components/howto/HowToContextual";
import { supabase } from "@/integrations/supabase/client";
import { lessonForUnit } from "@/lib/curriculum";
import { lessonFromPayload, parseLessonPayload } from "@/lib/lesson-payload";

export function resolveTaskLesson(task: {
  unit_tag?: string | null;
  lesson_payload?: unknown;
}) {
  const payload = parseLessonPayload(task.lesson_payload);
  if (payload) return { lesson: lessonFromPayload(payload), payload };
  const lesson = lessonForUnit(task.unit_tag);
  return lesson ? { lesson, payload: null } : null;
}
export type Task = {
  id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  unit_tag: string | null;
  xp_reward: number;
  is_completed: boolean;
  created_by: string | null;
  is_draft?: boolean;
  lesson_payload?: unknown;
  source_credit?: string | null;
  worksheet_pdf_url?: string | null;
  published_at?: string | null;
};

export type TaskProgress = {
  task_id: string;
  score: number;
  xp_awarded: number;
  completed_at: string;
  attempt_count?: number;
  last_attempt_at?: string;
};

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export function useTaskProgress(userId?: string) {
  return useQuery({
    queryKey: ["task_progress", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { fetchTaskProgress } = await import("@/lib/task-progress");
      return fetchTaskProgress(userId!);
    },
  });
}

function progressRank(score: number | undefined): number {
  if (score == null || score < 70) return 0; // not mastered — top
  if (score < 100) return 1; // mastered, retry for 100%
  return 2; // perfect — bottom
}

export function TaskBoard({
  tasks,
  loading,
  error,
  accent,
  userId,
  howtoEnabled = true,
}: {
  tasks: Task[];
  loading: boolean;
  error: boolean;
  accent: string;
  userId: string;
  howtoEnabled?: boolean;
}) {
  const { data: progress, isLoading: progressLoading } = useTaskProgress(userId);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const progressByTask = new Map((progress ?? []).map((p) => [p.task_id, p]));
  const masteredIds = new Set(
    (progress ?? []).filter((p) => p.score >= 70).map((p) => p.task_id),
  );
  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;
  const activeProgress = activeTask ? progressByTask.get(activeTask.id) : undefined;

  if (loading || progressLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading lessons…
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card p-8 text-center text-sm text-destructive">
        We couldn&apos;t load your lessons. Please refresh and try again.
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <HowToContextual
          userId={userId}
          shortId="student-subjects"
          enabled={howtoEnabled}
        />
        <p className="text-sm font-semibold">No lessons here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A parent can add assignments from the Parent Portal.
        </p>
      </div>
    );
  }

  if (activeTask) {
    return (
      <LessonPractice
        task={activeTask}
        accent={accent}
        userId={userId}
        alreadyCompleted={masteredIds.has(activeTask.id)}
        bestScore={activeProgress?.score ?? null}
        attemptCount={activeProgress?.attempt_count ?? 0}
        onClose={() => setActiveTaskId(null)}
        howtoEnabled={howtoEnabled}
      />
    );
  }

  const doneCount = tasks.filter((t) => masteredIds.has(t.id)).length;

  // Incomplete first, then mastered-but-not-perfect, then perfect 100%.
  const sortedTasks = [...tasks].sort((a, b) => {
    const aRank = progressRank(progressByTask.get(a.id)?.score);
    const bRank = progressRank(progressByTask.get(b.id)?.score);
    if (aRank !== bRank) return aRank - bRank;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1.5 font-semibold">
          <BookOpenCheck className="size-3.5 text-primary" />
          Aligned to NYC Grade 5 standards (Hudson Cliffs) — learn, then quiz for XP.
        </p>
        <p>
          {doneCount}/{tasks.length} mastered
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {sortedTasks.map((task) => {
            const row = progressByTask.get(task.id);
            const done = masteredIds.has(task.id);
            const perfect = (row?.score ?? 0) >= 100;
            const attempts = row?.attempt_count ?? 0;
            const resolved = resolveTaskLesson(task);
            const lesson = resolved?.lesson;
            return (
              <motion.button
                key={task.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                whileHover={{ y: -3 }}
                onClick={() => setActiveTaskId(task.id)}
                style={{ borderColor: `var(--${accent})` }}
                className={`surface-card group relative overflow-hidden p-4 text-left transition ${
                  done ? "opacity-90" : ""
                }`}
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: `var(--${accent})` }}
                />
                <div className="flex items-start gap-3 pl-2">
                  {perfect ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-xp" />
                  ) : done ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold">{task.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {lesson
                        ? resolved?.payload?.worksheet
                          ? `${lesson.questions.length} quiz questions + fillable worksheet`
                          : `${lesson.questions.length} practice questions · learn first, then quiz`
                        : task.description || "Practice coming soon for this unit."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {task.unit_tag && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold tracking-wide text-secondary-foreground">
                          <Tag className="size-3" />
                          {task.unit_tag}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-md bg-background/70 px-2 py-1 text-[10px] font-bold text-xp">
                        <Zap className="size-3" />+{task.xp_reward} XP
                      </span>
                      {attempts > 0 && (
                        <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground">
                          {attempts} attempt{attempts === 1 ? "" : "s"}
                        </span>
                      )}
                      {row && (
                        <span
                          className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                            perfect
                              ? "bg-xp/15 text-xp"
                              : done
                                ? "bg-success/15 text-success"
                                : "bg-background/70 text-muted-foreground"
                          }`}
                        >
                          Best {row.score}%
                          {done && !perfect ? " · retry for 100%" : ""}
                          {perfect ? " · perfect" : ""}
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary opacity-0 transition group-hover:opacity-100">
                        <Play className="size-3" />{" "}
                        {perfect ? "Review" : done ? "Retry for 100%" : "Start"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
