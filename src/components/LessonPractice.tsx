import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LessonCoach } from "@/components/LessonCoach";
import { LessonVideo } from "@/components/LessonVideo";
import { HowToContextual } from "@/components/howto/HowToContextual";
import { ScribblePad, type ScribblePadHandle } from "@/components/ScribblePad";
import { resolveTaskLesson, type Task } from "@/components/TaskBoard";
import { useDailyActivityTracker } from "@/hooks/useDailyActivityTracker";
import { I18nError, useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { celebrate } from "@/lib/confetti";
import { checkAnswer, type Question } from "@/lib/curriculum";
import { DAILY_LEADERBOARD_QUERY_KEY, upsertDailyScore } from "@/lib/daily-activity";
import { detectLevelUp, levelForXp, type LevelUpInfo } from "@/lib/gamification";
import { gradeWorksheet } from "@/lib/grading.functions";
import {
  fieldAnswerHasContent,
  hasFillableWorksheet,
  normalizeFieldAnswer,
  type LessonPayload,
  type WorksheetAiFeedback,
  type WorksheetField,
  type WorksheetFieldAnswer,
} from "@/lib/lesson-payload";
import { LevelUpCelebration } from "@/components/LevelUpCelebration";

type Phase = "teach" | "quiz" | "worksheet" | "results";

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
  bestScore: initialBestScore = null,
  attemptCount: initialAttemptCount = 0,
  onClose,
  howtoEnabled = true,
}: {
  task: Task;
  accent: string;
  userId: string;
  alreadyCompleted: boolean;
  bestScore?: number | null;
  attemptCount?: number;
  onClose: () => void;
  howtoEnabled?: boolean;
}) {
  const resolved = resolveTaskLesson(task);
  const lesson = resolved?.lesson ?? null;
  const payload: LessonPayload | null = resolved?.payload ?? null;
  const needsWorksheet = hasFillableWorksheet(payload);
  const queryClient = useQueryClient();
  const gradeWorksheetFn = useServerFn(gradeWorksheet);
  const { t, tDb, tError, formatNumber } = useTranslation();

  const [phase, setPhase] = useState<Phase>("teach");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [shortValue, setShortValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [worksheetAnswers, setWorksheetAnswers] = useState<
    Record<string, WorksheetFieldAnswer>
  >({});
  const [worksheetInk, setWorksheetInk] = useState<Record<string, boolean>>({});
  const scribbleRefs = useRef<Record<string, ScribblePadHandle | null>>({});
  const [worksheetFeedback, setWorksheetFeedback] = useState<WorksheetAiFeedback | null>(null);
  const [worksheetScore, setWorksheetScore] = useState<number | null>(null);
  const [masteryXp, setMasteryXp] = useState(0);
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [bestScore, setBestScore] = useState<number | null>(initialBestScore);

  useEffect(() => {
    setAttemptCount(initialAttemptCount);
    setBestScore(initialBestScore);
  }, [task.id, initialAttemptCount, initialBestScore]);

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
  const liveQuizScore = total ? Math.round((correctCount / total) * 100) : 0;
  const effectiveQuizScore = quizScore ?? liveQuizScore;
  const passedQuiz = lesson ? effectiveQuizScore >= lesson.passPercent : false;
  const passedWorksheet =
    worksheetScore != null && worksheetScore >= (lesson?.passPercent ?? 70);
  const passed = needsWorksheet
    ? passedQuiz && passedWorksheet
    : lesson
      ? effectiveQuizScore >= lesson.passPercent
      : false;

  useDailyActivityTracker({
    enabled: Boolean(lesson) && (phase === "teach" || phase === "quiz" || phase === "worksheet"),
    taskId: task.id,
    subjectId: task.subject_id,
  });

  const saveQuizProgress = useMutation({
    mutationFn: async (payloadScore: {
      score: number;
      correctCount: number;
      total: number;
      records: AnswerRecord[];
      passed: boolean;
    }) => {
      await upsertDailyScore({
        taskId: task.id,
        score: payloadScore.score,
        subjectId: task.subject_id,
      });

      // Always record the attempt (pass or fail). XP only on first mastery.
      if (needsWorksheet || !lesson) {
        return {
          awarded: 0,
          previousXp: 0,
          newXp: 0,
          attemptCount: 0,
          bestScore: 0,
          improved: false,
          isPerfect: false,
        };
      }

      const { saveTaskProgress } = await import("@/lib/task-progress");
      const result = await saveTaskProgress({
        userId,
        taskId: task.id,
        score: payloadScore.score,
        correctCount: payloadScore.correctCount,
        totalCount: payloadScore.total,
        xpAwarded: payloadScore.passed ? task.xp_reward : 0,
        answers: payloadScore.records,
      });

      let previousXp = 0;
      let newXp = 0;
      if (result.awarded > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("xp_points")
          .eq("id", userId)
          .maybeSingle();

        previousXp = profile?.xp_points ?? 0;
        newXp = previousXp + result.awarded;
        const { error: xpError } = await supabase
          .from("profiles")
          .update({ xp_points: newXp, level: levelForXp(newXp) })
          .eq("id", userId);
        if (xpError) throw xpError;
      }

      return {
        awarded: result.awarded,
        previousXp,
        newXp,
        attemptCount: result.attemptCount,
        bestScore: result.bestScore,
        improved: result.improved,
        isPerfect: result.isPerfect,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["task_progress", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: [DAILY_LEADERBOARD_QUERY_KEY] });
      if (result.attemptCount > 0) {
        setAttemptCount(result.attemptCount);
        setBestScore(result.bestScore);
      }
      if (result.awarded > 0) {
        void celebrate();
        toast.success(t("lesson.toast.masteredXp", { xp: formatNumber(result.awarded) }));
        const up = detectLevelUp(result.previousXp, result.awarded);
        if (up) setLevelUp(up);
      } else if (result.improved && result.bestScore >= 100) {
        toast.success(t("lesson.toast.perfect"));
      } else if (result.improved) {
        toast.success(t("lesson.toast.newBest", { score: formatNumber(result.bestScore) }));
      }
    },
    onError: (err: Error) => {
      toast.error(tError(err, "lesson.toast.saveFailed"));
    },
  });

  const submitWorksheet = useMutation({
    mutationFn: async () => {
      if (quizScore == null || quizScore < (lesson?.passPercent ?? 70)) {
        throw new I18nError("lesson.worksheet.quizFirst");
      }

      const fields = payload?.worksheet?.fields ?? [];
      const answers: Record<string, WorksheetFieldAnswer> = {};

      for (const field of fields) {
        const base = normalizeFieldAnswer(worksheetAnswers[field.id]);
        const scribble = scribbleRefs.current[field.id]?.exportImage() ?? undefined;
        const answer: WorksheetFieldAnswer = {
          ...base,
          scribble: scribble ?? undefined,
        };
        if (!fieldAnswerHasContent(answer, field.type === "multipart")) {
          throw new I18nError("lesson.worksheet.answerRequired", { prompt: field.prompt });
        }
        // The grader requires every blank of a typed multipart answer, so catch it
        // here where the message can be localized instead of on the server.
        if (field.type === "multipart" && !answer.scribble) {
          for (const part of field.parts ?? []) {
            if (!String(answer.parts?.[part.id] ?? "").trim()) {
              throw new I18nError("lesson.worksheet.partRequired", {
                prompt: field.prompt,
                part: part.prompt,
              });
            }
          }
        }
        answers[field.id] = answer;
      }

      return gradeWorksheetFn({
        data: {
          taskId: task.id,
          answers,
          quizScore,
        },
      });
    },
    onSuccess: (result) => {
      setWorksheetFeedback(result.feedback);
      setWorksheetScore(result.worksheetScore);
      setMasteryXp(result.xpAwarded);
      setPhase("results");
      void upsertDailyScore({
        taskId: task.id,
        score: result.combinedScore,
        subjectId: task.subject_id,
      });
      queryClient.invalidateQueries({ queryKey: ["task_progress", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: [DAILY_LEADERBOARD_QUERY_KEY] });
      if (result.passed && result.xpAwarded > 0) {
        void celebrate();
        toast.success(t("lesson.toast.worksheetMasteredXp", { xp: formatNumber(result.xpAwarded) }));
        if (typeof result.newXp === "number") {
          const previousXp = result.newXp - result.xpAwarded;
          const up = detectLevelUp(previousXp, result.xpAwarded);
          if (up) setLevelUp(up);
        }
      } else if (result.passed && result.alreadyMastered) {
        if (result.isPerfect) {
          toast.success(t("lesson.toast.perfect"));
        } else if (
          typeof result.bestScore === "number" &&
          result.bestScore > (bestScore ?? 0)
        ) {
          toast.success(
            t("lesson.toast.newBestKeepGoing", { score: formatNumber(result.bestScore) }),
          );
        } else {
          toast.success(t("lesson.toast.reviewNoXp"));
        }
      } else if (!result.passed) {
        toast.message(t("lesson.toast.worksheetKeepPracticing"));
      }
      if (typeof result.attemptCount === "number") {
        setAttemptCount(result.attemptCount);
      }
      if (typeof result.bestScore === "number") {
        setBestScore(result.bestScore);
      }
    },
    onError: (err: Error) => {
      toast.error(tError(err, "lesson.toast.worksheetGradeFailed"));
    },
  });

  function resetQuiz() {
    setPhase("quiz");
    setIndex(0);
    setSelected(null);
    setShortValue("");
    setRevealed(false);
    setRecords([]);
    setQuizScore(null);
    setWorksheetFeedback(null);
    setWorksheetScore(null);
    setMasteryXp(0);
  }

  function resetWorksheetOnly() {
    setPhase("worksheet");
    setWorksheetFeedback(null);
    setWorksheetScore(null);
    setMasteryXp(0);
    // Keep typed notes; clear ink so retry is intentional.
    for (const id of Object.keys(scribbleRefs.current)) {
      scribbleRefs.current[id]?.clear();
    }
    setWorksheetInk({});
  }

  function submitCurrent() {
    if (!question || !lesson) return;
    const response =
      question.type === "choice" ? String(selected ?? "") : shortValue;
    if (question.type === "choice" && selected === null) {
      toast.error(t("lesson.pickAnswerFirst"));
      return;
    }
    if (question.type === "short" && !shortValue.trim()) {
      toast.error(t("lesson.typeAnswerFirst"));
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
      setQuizScore(finalScore);

      if (needsWorksheet && didPass) {
        setPhase("worksheet");
        void upsertDailyScore({
          taskId: task.id,
          score: finalScore,
          subjectId: task.subject_id,
        });
        return;
      }

      setPhase("results");
      saveQuizProgress.mutate({
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

  const worksheetFields = useMemo(
    () => payload?.worksheet?.fields ?? [],
    [payload?.worksheet?.fields],
  );

  const coachContext = useMemo(() => {
    if (!lesson) return "";
    const parts = [
      ...lesson.teach,
      lesson.tip ? `Coach tip: ${lesson.tip}` : "",
      lesson.transcript ? `Reading / transcript excerpt:\n${lesson.transcript.slice(0, 2500)}` : "",
      phase === "worksheet" && payload?.worksheet?.instructions
        ? `Worksheet instructions: ${payload.worksheet.instructions}`
        : "",
    ].filter(Boolean);
    return parts.join("\n").slice(0, 5500);
  }, [lesson, phase, payload?.worksheet?.instructions]);

  const coachQuestionText = useMemo(() => {
    if (phase === "quiz" && question) {
      if (question.type === "choice") {
        const opts = question.choices
          .map((c, i) => `${String.fromCharCode(65 + i)}. ${c}`)
          .join("\n");
        return `${question.prompt}\n${opts}`;
      }
      return question.prompt;
    }
    if (phase === "worksheet" && worksheetFields.length) {
      return worksheetFields
        .map((f, i) => `${i + 1}. ${f.prompt}`)
        .join("\n")
        .slice(0, 1000);
    }
    return undefined;
  }, [phase, question, worksheetFields]);

  /** Answer-key notes for the coach only — never rendered in the student UI. */
  const coachPrivateHints = useMemo(() => {
    if (phase !== "worksheet" || !worksheetFields.length) return undefined;
    const lines = worksheetFields
      .map((f) => (f.gradingHint ? `${f.prompt}: ${f.gradingHint}` : null))
      .filter(Boolean);
    if (!lines.length) return undefined;
    return lines.join("\n").slice(0, 4000);
  }, [phase, worksheetFields]);

  if (!lesson) {
    return (
      <div className="surface-card space-y-4 p-6">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> {t("lesson.backToLessons")}
        </button>
        <h2 className="text-lg font-bold">{tDb("tasks.title", task.title)}</h2>
        <p className="text-sm text-muted-foreground">
          {t("lesson.notReadyBody", { example: "187_MATH_FRACTIONS" })}
        </p>
        {task.description && (
          <p className="rounded-lg border border-border bg-background/50 p-3 text-sm">
            {tDb("tasks.description", task.description)}
          </p>
        )}
      </div>
    );
  }

  const phaseLabel = t(`lesson.phase.${phase}`);

  return (
    <div className="space-y-4">
      <LevelUpCelebration info={levelUp} onClose={() => setLevelUp(null)} />
      <HowToContextual
        userId={userId}
        shortId="student-lesson"
        enabled={howtoEnabled}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> {t("lesson.backToLessons")}
        </button>
        <span
          className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `color-mix(in oklch, var(--${accent}) 20%, transparent)`,
            color: `var(--${accent})`,
          }}
        >
          {task.unit_tag}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {phaseLabel}
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold">{lesson.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tDb("tasks.title", task.title)}</p>
          {(payload?.sourceCredit || task.source_credit) && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {payload?.sourceCredit || task.source_credit}
            </p>
          )}
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
                  transcript={lesson.transcript}
                />
                {lesson.transcript && !lesson.youtubeVideoId && (
                  <details className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                    <summary className="cursor-pointer font-semibold">
                      {t("lesson.readingText")}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {lesson.transcript}
                    </p>
                  </details>
                )}
                <div className="flex items-start gap-2 rounded-xl border border-xp/30 bg-xp/10 p-3 text-sm">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-xp" />
                  <p>
                    <span className="font-bold text-xp">{t("lesson.coachTipPrefix")}</span>
                    {lesson.tip}
                  </p>
                </div>
                <button
                  onClick={() => setPhase("quiz")}
                  className="glow-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  {t("lesson.startQuiz")} <ArrowRight className="size-4" />
                </button>
                {needsWorksheet && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("lesson.worksheetHeadsUp", { pass: formatNumber(lesson.passPercent) })}
                  </p>
                )}
                {(attemptCount > 0 || bestScore != null) && (
                  <p className="text-center text-xs text-muted-foreground">
                    {attemptCount > 0
                      ? t("common.attempts", { count: attemptCount })
                      : t("lesson.noAttemptsYet")}
                    {bestScore != null
                      ? t("lesson.bestScoreSuffix", { score: formatNumber(bestScore) })
                      : ""}
                    {bestScore != null && bestScore >= 100
                      ? t("lesson.perfectSuffix")
                      : bestScore != null && bestScore >= (lesson.passPercent ?? 70)
                        ? t("lesson.retrySuffix")
                        : ""}
                  </p>
                )}
                {alreadyCompleted && bestScore != null && bestScore < 100 && (
                  <p className="text-center text-xs font-semibold text-xp">
                    {t("lesson.masteredRetryFor100", { score: formatNumber(bestScore) })}
                  </p>
                )}
                {alreadyCompleted && bestScore != null && bestScore >= 100 && (
                  <p className="text-center text-xs text-success">
                    {t("lesson.perfectUnlocked")}
                  </p>
                )}
                {alreadyCompleted && bestScore == null && (
                  <p className="text-center text-xs text-success">{t("lesson.alreadyMastered")}</p>
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
                    {t("lesson.questionCounter", {
                      index: formatNumber(index + 1),
                      total: formatNumber(total),
                    })}
                  </span>
                  <span>
                    {needsWorksheet
                      ? t("lesson.needToContinue", { pass: formatNumber(lesson.passPercent) })
                      : t("lesson.needToEarnXp", { pass: formatNumber(lesson.passPercent) })}
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
                  fallbackPlaceholder={t("lesson.answerPlaceholder")}
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
                          <CheckCircle2 className="size-4" /> {t("lesson.correct")}
                        </>
                      ) : (
                        <>
                          <XCircle className="size-4" /> {t("lesson.notYet")}
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
                      {t("lesson.checkAnswer")}
                    </button>
                  ) : (
                    <button
                      onClick={goNext}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                    >
                      {index >= total - 1
                        ? needsWorksheet &&
                          Math.round(
                            (records.filter((r) => r.correct).length / lesson.questions.length) *
                              100,
                          ) >= lesson.passPercent
                          ? t("lesson.continueToWorksheet")
                          : t("lesson.seeResults")
                        : t("lesson.nextQuestion")}
                      <ArrowRight className="size-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {phase === "worksheet" && payload?.worksheet && (
              <motion.div
                key="worksheet"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <header className="space-y-2 text-start">
                  <h3 className="font-display text-lg font-extrabold leading-snug sm:text-xl">
                    {payload.worksheet.title ?? t("lesson.worksheet.defaultTitle")}
                  </h3>
                  {payload.worksheet.instructions && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {payload.worksheet.instructions}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("lesson.worksheet.statusLine", {
                      quiz: formatNumber(quizScore ?? 0),
                      pass: formatNumber(lesson.passPercent),
                    })}
                  </p>
                </header>

                <ol className="space-y-6">
                  {worksheetFields.map((field, i) => (
                    <li key={field.id}>
                      <WorksheetFieldInput
                        index={i + 1}
                        field={field}
                        value={worksheetAnswers[field.id]}
                        disabled={submitWorksheet.isPending}
                        scribbleRef={(handle) => {
                          scribbleRefs.current[field.id] = handle;
                        }}
                        onInkChange={(hasInk) =>
                          setWorksheetInk((prev) =>
                            prev[field.id] === hasInk ? prev : { ...prev, [field.id]: hasInk },
                          )
                        }
                        onChange={(next) =>
                          setWorksheetAnswers((prev) => ({ ...prev, [field.id]: next }))
                        }
                      />
                    </li>
                  ))}
                </ol>

                <div className="sticky bottom-2 z-10 pt-2">
                  <button
                    type="button"
                    disabled={submitWorksheet.isPending}
                    onClick={() => submitWorksheet.mutate()}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-lg disabled:opacity-60"
                  >
                    {submitWorksheet.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> {t("lesson.worksheet.grading")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" /> {t("lesson.worksheet.submit")}
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    {t("lesson.worksheet.inkProgress", {
                      filled: formatNumber(Object.values(worksheetInk).filter(Boolean).length),
                      total: formatNumber(worksheetFields.length),
                    })}
                  </p>
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
                {(saveQuizProgress.isPending || submitWorksheet.isPending) && (
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> {t("lesson.savingProgress")}
                  </p>
                )}
                <p className="font-display text-4xl font-black text-xp">
                  {t("common.percent", {
                    value: formatNumber(
                      needsWorksheet && worksheetScore != null
                        ? Math.round((effectiveQuizScore + worksheetScore) / 2)
                        : effectiveQuizScore,
                    ),
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {needsWorksheet && worksheetScore != null
                    ? t("lesson.quizAndWorksheetScore", {
                        quiz: formatNumber(effectiveQuizScore),
                        worksheet: formatNumber(worksheetScore),
                      })
                    : t("lesson.correctOfTotal", {
                        correct: formatNumber(correctCount),
                        total: formatNumber(total),
                      })}
                </p>

                {needsWorksheet && worksheetFeedback && (
                  <WorksheetFeedbackCard feedback={worksheetFeedback} />
                )}

                {passed ? (
                  <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
                    <p className="font-bold text-success">
                      {effectiveQuizScore >= 100 ||
                      (needsWorksheet &&
                        worksheetScore != null &&
                        Math.round((effectiveQuizScore + worksheetScore) / 2) >= 100)
                        ? t("lesson.perfectScore")
                        : t("lesson.mastered")}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {alreadyCompleted ||
                      (needsWorksheet && masteryXp === 0 && worksheetScore != null)
                        ? bestScore != null && bestScore < 100
                          ? t("lesson.masteredReviewBest", { score: formatNumber(bestScore) })
                          : t("lesson.masteredReviewAlready")
                        : t("lesson.masteredEarned", {
                            xp: formatNumber(
                              needsWorksheet ? masteryXp || task.xp_reward : task.xp_reward,
                            ),
                          })}
                    </p>
                    {attemptCount > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("lesson.attemptsLine", { count: attemptCount })}
                        {bestScore != null
                          ? t("lesson.attemptsBestSuffix", { score: formatNumber(bestScore) })
                          : ""}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                    <p className="font-bold text-destructive">{t("lesson.keepPracticing")}</p>
                    <p className="mt-1 text-muted-foreground">
                      {needsWorksheet && passedQuiz && !passedWorksheet
                        ? t("lesson.keepPracticingWorksheet", {
                            pass: formatNumber(lesson.passPercent),
                          })
                        : t("lesson.keepPracticingQuiz", {
                            pass: formatNumber(lesson.passPercent),
                          })}
                    </p>
                    {attemptCount > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("lesson.attemptsLine", { count: attemptCount })}
                        {bestScore != null
                          ? t("lesson.attemptsBestSuffix", { score: formatNumber(bestScore) })
                          : ""}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  {needsWorksheet && passedQuiz && !passedWorksheet ? (
                    <button
                      onClick={resetWorksheetOnly}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold"
                    >
                      <RotateCcw className="size-4" /> {t("lesson.retryWorksheet")}
                    </button>
                  ) : (
                    <button
                      onClick={resetQuiz}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold"
                    >
                      <RotateCcw className="size-4" />{" "}
                      {passed && bestScore != null && bestScore < 100
                        ? t("lesson.retryFor100")
                        : t("lesson.tryAgain")}
                    </button>
                  )}
                  <button
                    onClick={() => setPhase("teach")}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold"
                  >
                    <BookOpen className="size-4" /> {t("lesson.reviewLesson")}
                  </button>
                  <button
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    {t("lesson.backToBoard")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {phase !== "results" && (
        <LessonCoach
          lessonTitle={lesson.title}
          lessonContext={coachContext}
          questionText={coachQuestionText}
          privateHints={coachPrivateHints}
        />
      )}
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
  fallbackPlaceholder,
}: {
  question: Question;
  selected: number | null;
  shortValue: string;
  revealed: boolean;
  onSelect: (i: number) => void;
  onShortChange: (v: string) => void;
  fallbackPlaceholder: string;
}) {
  return (
    <div className="space-y-3 text-start">
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
                className={`rounded-xl border px-3 py-3 text-start text-sm transition ${
                  showCorrect
                    ? "border-success bg-success/15"
                    : showWrong
                      ? "border-destructive bg-destructive/15"
                      : isSelected
                        ? "border-primary bg-primary/15"
                        : "border-border bg-background/60 hover:bg-secondary"
                }`}
              >
                <span className="me-2 font-bold text-muted-foreground">
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
          placeholder={question.placeholder ?? fallbackPlaceholder}
        />
      )}
    </div>
  );
}

function WorksheetFieldInput({
  index,
  field,
  value,
  disabled,
  onChange,
  scribbleRef,
  onInkChange,
}: {
  index: number;
  field: WorksheetField;
  value: WorksheetFieldAnswer | undefined;
  disabled?: boolean;
  onChange: (next: WorksheetFieldAnswer) => void;
  scribbleRef: (handle: ScribblePadHandle | null) => void;
  onInkChange: (hasInk: boolean) => void;
}) {
  const { t } = useTranslation();
  const answer = normalizeFieldAnswer(value);

  return (
    <section className="space-y-3 text-start">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold"
          aria-hidden
        >
          {index}
        </span>
        <h4 className="min-w-0 flex-1 text-base font-bold leading-snug sm:text-lg">
          {field.prompt}
        </h4>
      </div>

      <ScribblePad
        ref={(handle) => {
          scribbleRef(handle);
        }}
        disabled={disabled}
        heightPx={field.type === "numeric" ? 160 : 220}
        onInkChange={onInkChange}
        label={t("lesson.worksheet.writeHere")}
      />

      {field.type === "multipart" ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("lesson.worksheet.optionalTypedBlanks")}
          </p>
          {(field.parts ?? []).map((part) => (
            <label key={part.id} className="block">
              <span className="text-xs font-semibold text-muted-foreground">{part.prompt}</span>
              <input
                className="input-base mt-1 min-h-11 text-base"
                disabled={disabled}
                value={answer.parts?.[part.id] ?? ""}
                placeholder={part.placeholder ?? t("lesson.worksheet.typeIfYouWant")}
                onChange={(e) =>
                  onChange({
                    ...answer,
                    parts: { ...(answer.parts ?? {}), [part.id]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
      ) : (
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("lesson.worksheet.optionalTypedNotes")}
          </span>
          {field.type === "numeric" ? (
            <input
              className="input-base min-h-11 text-base"
              inputMode="decimal"
              disabled={disabled}
              value={answer.text ?? ""}
              placeholder={field.placeholder ?? t("lesson.worksheet.typeNumber")}
              onChange={(e) => onChange({ ...answer, text: e.target.value })}
            />
          ) : (
            <textarea
              className="input-base min-h-14 text-base"
              disabled={disabled}
              value={answer.text ?? ""}
              placeholder={field.placeholder ?? t("lesson.worksheet.typeAnswer")}
              onChange={(e) => onChange({ ...answer, text: e.target.value })}
            />
          )}
        </label>
      )}
    </section>
  );
}

function WorksheetFeedbackCard({ feedback }: { feedback: WorksheetAiFeedback }) {
  const { t, formatNumber } = useTranslation();
  const notes = Object.entries(feedback.field_notes ?? {});
  return (
    <div className="overflow-hidden rounded-xl border border-border text-start">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-primary" /> {t("lesson.worksheet.feedbackTitle")}
        </div>
        <div className="text-xl font-black text-xp">
          {t("lesson.worksheet.score", { score: formatNumber(feedback.score) })}
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-success">
            {t("lesson.worksheet.strengths")}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">{feedback.strengths}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ela">
            {t("lesson.worksheet.improvements")}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">{feedback.improvements}</p>
        </div>
        {feedback.teacher_note && (
          <p className="sm:col-span-2 text-sm font-semibold text-primary">{feedback.teacher_note}</p>
        )}
        {notes.length > 0 && (
          <div className="sm:col-span-2 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("lesson.worksheet.perQuestionNotes")}
            </h4>
            {notes.map(([id, note]) => (
              <p key={id} className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{id}: </span>
                {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
