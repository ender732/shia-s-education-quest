import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, Tag, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { celebrate } from "@/lib/confetti";

export type Task = {
  id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  unit_tag: string | null;
  xp_reward: number;
  is_completed: boolean;
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

export function TaskBoard({
  tasks,
  loading,
  error,
  accent,
  userId,
}: {
  tasks: Task[];
  loading: boolean;
  error: boolean;
  accent: string;
  userId: string;
}) {
  const queryClient = useQueryClient();

  const toggle = useMutation({
    mutationFn: async (task: Task) => {
      const next = !task.is_completed;
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ is_completed: next })
        .eq("id", task.id);
      if (taskError) throw taskError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .maybeSingle();

      const delta = next ? task.xp_reward : -task.xp_reward;
      const newXp = Math.max(0, (profile?.xp_points ?? 0) + delta);
      await supabase
        .from("profiles")
        .update({ xp_points: newXp, level: Math.floor(newXp / 500) + 1 })
        .eq("id", userId);

      return { next, xp: task.xp_reward };
    },
    onSuccess: ({ next, xp }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      if (next) {
        void celebrate();
        toast.success(`Task complete! +${xp} XP`);
      } else {
        toast(`Task reopened. -${xp} XP`);
      }
    },
    onError: (err: Error) => toast.error(err.message || "Could not update that task."),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading tasks…
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card p-8 text-center text-sm text-destructive">
        We couldn&apos;t load your tasks. Please refresh and try again.
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-sm font-semibold">No tasks here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A parent can add assignments from the Parent Portal.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <motion.button
            key={task.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            whileHover={{ y: -3 }}
            onClick={() => toggle.mutate(task)}
            disabled={toggle.isPending}
            style={{ borderColor: `var(--${accent})` }}
            className={`surface-card group relative overflow-hidden p-4 text-left transition disabled:opacity-60 ${
              task.is_completed ? "opacity-70" : ""
            }`}
          >
            <span
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: `var(--${accent})` }}
            />
            <div className="flex items-start gap-3 pl-2">
              {task.is_completed ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <h3
                  className={`text-sm font-bold ${task.is_completed ? "line-through decoration-2" : ""}`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {task.description}
                  </p>
                )}
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
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
