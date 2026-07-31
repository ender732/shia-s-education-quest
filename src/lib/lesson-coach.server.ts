import {
  generateGeminiText,
  type GeminiContent,
} from "@/lib/gemini.server";

/**
 * Free-tier optimized coach:
 * - Complete reply in one shot (no mid-sentence cuts)
 * - Compact but useful (~90–140 words) to save daily token/request quota
 * - thinkingBudget 0 so every output token is student-visible text
 */
const SYSTEM_PROMPT = `You are "AI Coach", a warm NYC District 6 / P.S./I.S. 187 Hudson Cliffs Grade 5 tutor.

Help the student understand the CURRENT LESSON so they can keep working on THEIR OWN answers.

Voice: plain English for a 10-year-old; warm; never shame.

In ONE complete reply, cover:
1) Show you got their question (1 sentence)
2) Explain the idea clearly (2–4 short sentences)
3) One concrete example or analogy (use different numbers/words than any quiz key)
4) One next step they can try
5) One short check-in question

Length: about 90–140 words. Finish every sentence. Never stop mid-thought.

Never:
- write their worksheet/quiz answer for them
- reveal which MC choice is correct
- paste answer-key text
- go off-topic or ask for personal info

Plain text only (no JSON, no markdown headings). Short line breaks are OK.`;

export type CoachHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askLessonCoachWithAi(input: {
  lessonTitle: string;
  lessonContext: string;
  questionText?: string;
  /** Hidden answer-key / rubric notes — coach guidance only, never shown as student answers. */
  privateHints?: string;
  userMessage: string;
  history?: CoachHistoryMessage[];
}): Promise<string> {
  // Keep history short to save free-tier input tokens.
  const history = (input.history ?? []).slice(-4);

  const contextBlock = [
    `Lesson: ${input.lessonTitle}`,
    `Notes:\n${input.lessonContext.slice(0, 2800)}`,
    input.questionText
      ? `Current question (do NOT give the final answer):\n${input.questionText.slice(0, 600)}`
      : null,
    input.privateHints
      ? `PRIVATE coach notes (do not paste as the student's answer):\n${input.privateHints.slice(0, 1200)}`
      : null,
    `Student:\n${input.userMessage}`,
    "Reply once, fully finished (~90–140 words): understand → explain → example → next step → check-in.",
  ]
    .filter((line) => line !== null)
    .join("\n\n");

  const contents: GeminiContent[] = [
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content.slice(0, 600) }],
    })),
    { role: "user", parts: [{ text: contextBlock }] },
  ];

  const reply = await generateGeminiText({
    featureLabel: "coaching",
    system: SYSTEM_PROMPT,
    contents,
    temperature: 0.55,
    // ~140 words ≈ 200 tokens; 1024 leaves headroom without burning free-tier quota.
    maxOutputTokens: 1024,
    thinkingBudget: 0,
  });

  return reply.slice(0, 1800);
}
