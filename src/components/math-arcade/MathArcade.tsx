import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, Sparkles, Star, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { NumberDashGame } from "@/components/math-arcade/NumberDashGame";
import { useTaskProgress, type Task } from "@/components/TaskBoard";
import {
  MATH_ARCADE_MODES,
  MATH_ARCADE_XP_TODO,
  modeById,
  pickRecommendedMode,
  type MathArcadeModeId,
} from "@/lib/math-arcade";

type MathArcadeProps = {
  tasks: Task[];
  userId: string;
};

export function MathArcade({ tasks, userId }: MathArcadeProps) {
  const { data: progress } = useTaskProgress(userId);
  const [playingId, setPlayingId] = useState<MathArcadeModeId | null>(null);
  const [expanded, setExpanded] = useState(false);

  const masteredIds = useMemo(
    () => new Set((progress ?? []).filter((p) => p.score >= 70).map((p) => p.task_id)),
    [progress],
  );

  const recommended = useMemo(
    () => pickRecommendedMode(tasks, masteredIds),
    [tasks, masteredIds],
  );

  const activeMode = playingId ? modeById(playingId) : null;

  if (activeMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card overflow-hidden p-4 sm:p-5"
      >
        <NumberDashGame mode={activeMode} onExit={() => setPlayingId(null)} />
      </motion.div>
    );
  }

  return (
    <section className="surface-card relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: `
            radial-gradient(40rem 18rem at 10% -20%, color-mix(in oklab, var(--math) 28%, transparent), transparent 55%),
            radial-gradient(28rem 16rem at 95% 0%, color-mix(in oklab, var(--xp) 18%, transparent), transparent 50%)
          `,
        }}
        aria-hidden
      />

      <div className="relative p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-math">
              <Gamepad2 className="size-3.5" /> Math Arcade
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
              Number Dash
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Side-scroll, jump obstacles, and clear Grade 5 challenge gates — themed to your
              Math units. Lessons still earn the real XP on the TaskBoard below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPlayingId(recommended.mode.id)}
            className="glow-ring inline-flex shrink-0 items-center gap-2 rounded-xl bg-math px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
          >
            <Sparkles className="size-4" />
            Play {recommended.mode.title}
          </button>
        </div>

        <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="size-3.5 text-xp" />
          {recommended.reason}
          {recommended.unitTag ? (
            <span className="rounded-md bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
              {recommended.unitTag}
            </span>
          ) : null}
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            {expanded ? "Hide topic games" : "Browse all Math topic games"}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 grid gap-2 overflow-hidden sm:grid-cols-2"
            >
              {MATH_ARCADE_MODES.map((mode) => {
                const isRec = mode.id === recommended.mode.id;
                return (
                  <li key={mode.id}>
                    <button
                      type="button"
                      onClick={() => setPlayingId(mode.id)}
                      className={`w-full rounded-xl border p-3 text-left transition hover:bg-secondary/60 ${
                        isRec ? "border-math bg-math/10" : "border-border bg-background/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{mode.title}</span>
                        {isRec && (
                          <span className="rounded-md bg-math/20 px-1.5 py-0.5 text-[10px] font-bold text-math">
                            Suggested
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {mode.blurb}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-xp">
                        <Zap className="size-3" /> Practice stars · no lesson XP yet
                      </span>
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Extension note for future subjects / XP — keep out of student-facing copy clutter */}
        <span className="sr-only">{MATH_ARCADE_XP_TODO}</span>
      </div>
    </section>
  );
}
