import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LessonVideo } from "@/components/LessonVideo";
import type { Task } from "@/components/TaskBoard";
import { useDailyActivityTracker } from "@/hooks/useDailyActivityTracker";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { celebrate } from "@/lib/confetti";
import { checkAnswer, lessonForUnit, type Question } from "@/lib/curriculum";
import { DAILY_LEADERBOARD_QUERY_KEY, upsertDailyScore } from "@/lib/daily-activity";
import { levelForXp } from "@/lib/gamification";

type Phase = "teach" | "quiz" | "results";

type AnswerRecord = {
  questionId: string;
  correct: boolean;
  response: string;
};

export function LessonPractice({
  task,
  accent,
  userId,
  alreadyCompleted,
  onClose,
}: {
  task: Task;
  accent: string;
  userId: string;
  alreadyCompleted: boolean;
  onClose: () => void;
}) {
  const lesson = lessonForUnit(task.unit_tag);
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("teach");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [shortValue, setShortValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  useEffect(() => {
    void trackEvent("lesson_open", {
      task_id: task.id,
      subject_id: task.subject_id,
      unit_tag: task.unit_tag ?? null,
    });
  }, [task.id, task.subject_id, task.unit_tag]);

  const question = lesson?.questions[index];
  const total = lesson?.questions.length ?? 0;
  const correctCount = records.filter((r) => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;
  const passed = lesson ? score >= lesson.passPercent : false;

  useDailyActivityTracker({
    enabled: Boolean(lesson) && (phase === "teach" || phase === "quiz"),
    taskId: task.id,
    subjectId: task.subject_id,
  });

  const saveProgress = useMutation({
    mutationFn: async (payload: {
      score: number;
      correctCount: number;
      total: number;
      records: AnswerRecord[];
      passed: boolean;
    }) => {
      await upsertDailyScore({
        taskId: task.id,
        score: payload.score,
        subjectId: task.subject_id,
      });

      if (!lesson || alreadyCompleted || !payload.passed) return { awarded: 0 };

      const { saveTaskProgress } = await import("@/lib/task-progress");
      const result = await saveTaskProgress({
        userId,
        taskId: task.id,
        score: payload.score,
        correctCount: payload.correctCount,
        totalCount: payload.total,
        xpAwarded: task.xp_reward,
        answers: payload.records,
      });

      if (result.already || result.awarded <= 0) return { awarded: 0 };

      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .maybeSingle();

      const newXp = (profile?.xp_points ?? 0) + result.awarded;
      const { error: xpError } = await supabase
        .from("profiles")
        .update({ xp_points: newXp, level: levelForXp(newXp) })
        .eq("id", userId);
      if (xpError) throw xpError;

      return { awarded: result.awarded };
    },
    onSuccess: ({ awarded }) => {
      queryClient.invalidateQueries({ queryKey: ["task_progress", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: [DAILY_LEADERBOARD_QUERY_KEY] });
      if (awarded > 0) {
        void celebrate();
        toast.success(`Lesson mastered! +${awarded} XP`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not save your progress.");
    },
  });

  function resetQuiz() {
    setPhase("quiz");
    setIndex(0);
    setSelected(null);
    setShortValue("");
    setRevealed(false);
    setRecords([]);
  }

  function submitCurrent() {
    if (!question || !lesson) return;
    const response =
      question.type === "choice" ? String(selected ?? "") : shortValue;
    if (question.type === "choice" && selected === null) {
      toast.error("Pick an answer first.");
      return;
    }
    if (question.type === "short" && !shortValue.trim()) {
      toast.error("Type your answer first.");
      return;
    }

    const correct = checkAnswer(
      question,
      question.type === "choice" ? (selected as number) : shortValue,
    );
    const nextRecords = [
      ...records.filter((r) => r.questionId !== question.id),
      { questionId: question.id, correct, response },
    ];
    setRecords(nextRecords);
    setRevealed(true);
  }

  function goNext() {
    if (!lesson) return;
    if (index >= lesson.questions.length - 1) {
      const finalCorrect = records.filter((r) => r.correct).length;
      const finalScore = Math.round((finalCorrect / lesson.questions.length) * 100);
      const didPass = finalScore >= lesson.passPercent;
      setPhase("results");
      // Always record today's best score; XP only on first pass.
      saveProgress.mutate({
        score: finalScore,
        correctCount: finalCorrect,
        total: lesson.questions.length,
        records,
        passed: didPass,
      });
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setShortValue("");
    setRevealed(false);
  }

  if (!lesson) {
    return (
      <div className="surface-card space-y-4 p-6">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to lessons
        </button>
        <h2 className="text-lg font-bold">{task.title}</h2>
        <p className="text-sm text-muted-foreground">
          Practice questions for this assignment are not ready yet. Ask a parent to
          tag it with a known unit code (like <code>187_MATH_FRACTIONS</code>).
        </p>
        {task.description && (
          <p className="rounded-lg border border-border bg-background/50 p-3 text-sm">
            {task.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to lessons
        </button>
        <span
          className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: `color-mix(in oklch, var(--${accent}) 20%, transparent)`, color: `var(--${accent})` }}
        >
          {task.unit_tag}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {phase === "teach" ? "Learn" : phase === "quiz" ? "Practice" : "Results"}
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold">{lesson.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{task.title}</p>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {phase === "teach" && (
              <motion.div
                key="teach"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-2 rounded-xl border border-border bg-background/50 p-3 text-sm">
                  <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="space-y-2">
                    {lesson.teach.map((line) => (
                      <p key={line} className="leading-relaxed text-muted-foreground">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                <LessonVideo
                  youtubeVideoId={lesson.youtubeVideoId}
                  youtubeTitle={lesson.youtubeTitle}
                  youtubeChannel={lesson.youtubeChannel}
                />
                <div className="flex items-start gap-2 rounded-xl border border-xp/30 bg-xp/10 p-3 text-sm">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-xp" />
                  <p>
                    <span className="font-bold text-xp">Coach tip: </span>
                    {lesson.tip}
                  </p>
                </div>
                <button
                  onClick={() => setPhase("quiz")}
                  className="glow-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  Start practice questions <ArrowRight className="size-4" />
                </button>
                {alreadyCompleted && (
                  <p className="text-center text-xs text-success">
                    You already mastered this lesson. You can still practice again.
                  </p>
                )}
              </motion.div>
            )}

            {phase === "quiz" && question && (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Question {index + 1} of {total}
                  </span>
                  <span>
                    Need {lesson.passPercent}% to earn XP
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${((index + (revealed ? 1 : 0)) / total) * 100}%`,
                      backgroundColor: `var(--${accent})`,
                    }}
                  />
                </div>

                <QuestionPrompt
                  question={question}
                  selected={selected}
                  shortValue={shortValue}
                  revealed={revealed}
                  onSelect={setSelected}
                  onShortChange={setShortValue}
                />

                {revealed && (
                  <div
                    className={`rounded-xl border p-3 text-sm ${
                      records.find((r) => r.questionId === question.id)?.correct
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-destructive/40 bg-destructive/10 text-destructive"
                    }`}
                  >
                    <p className="flex items-center gap-2 font-bold">
                      {records.find((r) => r.questionId === question.id)?.correct ? (
                        <>
                          <CheckCircle2 className="size-4" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="size-4" /> Not yet
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-foreground/90">{question.explanation}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {!revealed ? (
                    <button
                      onClick={submitCurrent}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                    >
                      Check answer
                    </button>
                  ) : (
                    <button
                      onClick={goNext}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                    >
                      {index >= total - 1 ? "See results" : "Next question"}
                      <ArrowRight className="size-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {phase === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 text-center"
              >
                {saveProgress.isPending && (
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Saving progress…
                  </p>
                )}
                <p className="font-display text-4xl font-black text-xp">{score}%</p>
                <p className="text-sm text-muted-foreground">
                  {correctCount} of {total} correct
                </p>
                {passed ? (
                  <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
                    <p className="font-bold text-success">Lesson mastered</p>
                    <p className="mt-1 text-muted-foreground">
                      {alreadyCompleted
                        ? "Nice review — XP was already earned earlier."
                        : `You earned +${task.xp_reward} XP for learning this skill.`}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                    <p className="font-bold text-destructive">Keep practicing</p>
                    <p className="mt-1 text-muted-foreground">
                      You need at least {lesson.passPercent}% to complete this lesson and earn XP.
                      Review the teaching notes and try again.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={resetQuiz}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold"
                  >
                    <RotateCcw className="size-4" /> Try again
                  </button>
                  <button
                    onClick={() => setPhase("teach")}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold"
                  >
                    <BookOpen className="size-4" /> Review lesson
                  </button>
                  <button
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    Back to board
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function QuestionPrompt({
  question,
  selected,
  shortValue,
  revealed,
  onSelect,
  onShortChange,
}: {
  question: Question;
  selected: number | null;
  shortValue: string;
  revealed: boolean;
  onSelect: (i: number) => void;
  onShortChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3 text-left">
      <h3 className="text-base font-bold leading-snug">{question.prompt}</h3>
      {question.type === "choice" ? (
        <div className="grid gap-2">
          {question.choices.map((choice, i) => {
            const isSelected = selected === i;
            const showCorrect = revealed && i === question.correctIndex;
            const showWrong = revealed && isSelected && i !== question.correctIndex;
            return (
              <button
                key={choice}
                type="button"
                disabled={revealed}
                onClick={() => onSelect(i)}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  showCorrect
                    ? "border-success bg-success/15"
                    : showWrong
                      ? "border-destructive bg-destructive/15"
                      : isSelected
                        ? "border-primary bg-primary/15"
                        : "border-border bg-background/60 hover:bg-secondary"
                }`}
              >
                <span className="mr-2 font-bold text-muted-foreground">
                  {String.fromCharCode(65 + i)}.
                </span>
                {choice}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          className="input-base"
          value={shortValue}
          disabled={revealed}
          onChange={(e) => onShortChange(e.target.value)}
          placeholder={question.placeholder ?? "Type your answer"}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
          }}
        />
      )}
    </div>
  );
}
