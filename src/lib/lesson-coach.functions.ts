import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HistoryMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(800),
});

const CoachInput = z.object({
  lessonTitle: z.string().min(1).max(200),
  lessonContext: z.string().min(1).max(6000),
  questionText: z.string().max(1000).optional(),
  userMessage: z
    .string()
    .min(2, "Type a short question for the coach.")
    .max(500, "Keep your question under 500 characters."),
  history: z.array(HistoryMessage).max(8).optional().default([]),
});

/** Light in-memory rate limit: max N coach calls per user per window (server process). */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function assertRateLimit(userId: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }
  if (bucket.count >= RATE_MAX) {
    throw new Error(
      "Whoa — slow down a bit. Wait about a minute before asking the coach again.",
    );
  }
  bucket.count += 1;
}

export const askLessonCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoachInput.parse(input))
  .handler(async ({ data, context }) => {
    assertRateLimit(context.userId);

    const { askLessonCoachWithAi } = await import("./lesson-coach.server");
    const reply = await askLessonCoachWithAi({
      lessonTitle: data.lessonTitle,
      lessonContext: data.lessonContext,
      questionText: data.questionText,
      userMessage: data.userMessage,
      history: data.history,
    });

    return { reply };
  });
