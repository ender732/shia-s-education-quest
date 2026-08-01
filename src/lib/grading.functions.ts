import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  fieldAnswerHasContent,
  hasFillableWorksheet,
  normalizeFieldAnswer,
  parseLessonPayload,
  type WorksheetFieldAnswer,
} from "@/lib/lesson-payload";
import { levelForXp } from "@/lib/gamification";

const GradeInput = z.object({
  bookId: z.string().uuid().nullable().optional(),
  bookTitle: z.string().max(300).default(""),
  chapter: z.string().max(300).default(""),
  reportText: z.string().min(40, "Write at least a few sentences before submitting.").max(20000),
});

const FieldAnswerSchema = z
  .object({
    text: z.string().max(4000).optional(),
    parts: z.record(z.string().max(2000)).optional(),
    /** JPEG/PNG data URL from scribble pad — capped to keep payloads reasonable. */
    scribble: z
      .string()
      .max(900_000)
      .refine((v) => !v || v.startsWith("data:image/"), "Scribble must be an image data URL")
      .optional(),
  })
  .strict();

const WorksheetGradeInput = z.object({
  taskId: z.string().uuid(),
  answers: z.record(
    z.union([
      z.string().max(4000),
      FieldAnswerSchema,
      z.record(z.string().max(2000)),
    ]),
  ),
  /** Quiz score from the 5 MCQs (0–100). Required when the lesson has a worksheet. */
  quizScore: z.number().int().min(0).max(100),
});

export const gradeBookReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GradeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { gradeWithAi, xpForScore } = await import("./grading.server");
    const feedback = await gradeWithAi({
      bookTitle: data.bookTitle,
      chapter: data.chapter,
      reportText: data.reportText,
    });
    const xpAwarded = xpForScore(feedback.score);

    const { supabase, userId } = context;

    const { data: report, error: reportError } = await supabase
      .from("book_reports")
      .insert({
        book_id: data.bookId ?? null,
        student_id: userId,
        chapter_or_topic: data.chapter || data.bookTitle || "Reading response",
        report_text: data.reportText,
        ai_score: `${feedback.score}/100`,
        ai_feedback: feedback,
        xp_awarded: xpAwarded,
      })
      .select()
      .single();

    if (reportError) {
      console.error("[gradeBookReport] insert failed", reportError.message);
      throw new Error("Could not save your report. Please try again.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_points")
      .eq("id", userId)
      .maybeSingle();

    const newXp = (profile?.xp_points ?? 0) + xpAwarded;
    const { error: xpError } = await supabase
      .from("profiles")
      .update({ xp_points: newXp, level: Math.floor(newXp / 500) + 1 })
      .eq("id", userId);

    if (xpError) {
      console.error("[gradeBookReport] xp update failed", xpError.message);
    }

    return { report, feedback, xpAwarded, newXp };
  });

const MASTERY_MIN = 70;

export const gradeWorksheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WorksheetGradeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isParent } = await supabase.rpc("is_parent", { _uid: userId });
    if (isParent) {
      throw new Error("Worksheet practice is for students.");
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, xp_reward, is_draft, lesson_payload")
      .eq("id", data.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw new Error("Lesson not found.");
    }
    if (task.is_draft) {
      throw new Error("This lesson is not published yet.");
    }

    const payload = parseLessonPayload(task.lesson_payload);
    if (!payload || !hasFillableWorksheet(payload)) {
      throw new Error("This lesson has no fillable worksheet to grade.");
    }

    const fields = payload.worksheet!.fields;
    const normalizedAnswers: Record<string, WorksheetFieldAnswer> = {};

    for (const field of fields) {
      const normalized = normalizeFieldAnswer(data.answers[field.id]);
      normalizedAnswers[field.id] = normalized;

      if (!fieldAnswerHasContent(normalized, field.type === "multipart")) {
        throw new Error(`Please write or draw an answer for: ${field.prompt}`);
      }

      // Multipart without scribble still needs each blank filled when only typing.
      if (
        field.type === "multipart" &&
        !normalized.scribble &&
        (field.parts?.length ?? 0) > 0
      ) {
        for (const part of field.parts ?? []) {
          const partVal = normalized.parts?.[part.id];
          if (!String(partVal ?? "").trim()) {
            throw new Error(`Please complete: ${field.prompt} — ${part.prompt}`);
          }
        }
      }
    }

    if (data.quizScore < MASTERY_MIN) {
      throw new Error(
        `Pass the practice quiz at ${MASTERY_MIN}% or higher before submitting the worksheet.`,
      );
    }

    const { gradeWorksheetWithAi } = await import("./grading.server");
    const feedback = await gradeWorksheetWithAi({
      lessonTitle: payload.title || task.title,
      worksheetTitle: payload.worksheet?.title,
      fields: fields.map((f) => ({
        id: f.id,
        type: f.type,
        prompt: f.prompt,
        gradingHint: f.gradingHint,
        parts: f.parts?.map((p) => ({ id: p.id, prompt: p.prompt })),
      })),
      answers: normalizedAnswers,
    });

    const worksheetPassed = feedback.score >= MASTERY_MIN;
    const combinedScore = Math.round((data.quizScore + feedback.score) / 2);
    const mastered = worksheetPassed && data.quizScore >= MASTERY_MIN;

    const { saveTaskProgress } = await import("./task-progress");
    const progressResult = await saveTaskProgress({
      userId,
      taskId: data.taskId,
      score: combinedScore,
      correctCount: Math.round((combinedScore / 100) * (fields.length + 5)),
      totalCount: fields.length + 5,
      xpAwarded: mastered ? task.xp_reward : 0,
      answers: {
        quizScore: data.quizScore,
        worksheetScore: feedback.score,
        worksheetAnswers: normalizedAnswers,
      },
    });

    const xpAwarded = progressResult.awarded;
    const alreadyMastered =
      progressResult.alreadyAwardedXp && progressResult.awarded === 0;
    let newXp: number | null = null;

    if (xpAwarded > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .maybeSingle();
      newXp = (profile?.xp_points ?? 0) + xpAwarded;
      const { error: xpError } = await supabase
        .from("profiles")
        .update({ xp_points: newXp, level: levelForXp(newXp) })
        .eq("id", userId);
      if (xpError) {
        console.error("[gradeWorksheet] xp update failed", xpError.message);
      }
    } else if (mastered) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .maybeSingle();
      newXp = profile?.xp_points ?? null;
    }

    const { data: submission, error: subError } = await supabase
      .from("worksheet_submissions")
      .insert({
        task_id: data.taskId,
        student_id: userId,
        answers: normalizedAnswers as never,
        ai_score: feedback.score,
        ai_feedback: feedback as never,
        xp_awarded: xpAwarded,
      })
      .select()
      .single();

    if (subError) {
      console.error("[gradeWorksheet] submission insert", subError.message);
      throw new Error("Could not save your worksheet. Please try again.");
    }

    return {
      submission,
      feedback,
      quizScore: data.quizScore,
      worksheetScore: feedback.score,
      combinedScore,
      passed: mastered,
      xpAwarded,
      alreadyMastered,
      newXp,
      attemptCount: progressResult.attemptCount,
      bestScore: progressResult.bestScore,
      isPerfect: progressResult.isPerfect,
    };
  });
