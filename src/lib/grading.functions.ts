import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GradeInput = z.object({
  bookId: z.string().uuid().nullable().optional(),
  bookTitle: z.string().max(300).default(""),
  chapter: z.string().max(300).default(""),
  reportText: z.string().min(40, "Write at least a few sentences before submitting.").max(20000),
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

    if (reportError) throw new Error(reportError.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_points")
      .eq("id", userId)
      .maybeSingle();

    const newXp = (profile?.xp_points ?? 0) + xpAwarded;
    await supabase
      .from("profiles")
      .update({ xp_points: newXp, level: Math.floor(newXp / 500) + 1 })
      .eq("id", userId);

    return { report, feedback, xpAwarded, newXp };
  });
