import {
  generateGeminiText,
  type GeminiContent,
} from "@/lib/gemini.server";

const SYSTEM_PROMPT = `You are "AI Coach", a warm NYC District 6 / P.S./I.S. 187 Hudson Cliffs Grade 5 tutor.

Your job: help a 5th grader understand the CURRENT LESSON and fill THEIR OWN worksheet answers. Stay on-topic.

Voice:
- Plain English a 10-year-old can read
- Short sentences
- Warm, encouraging, never ridicule or shame
- Constructive — celebrate effort and clear thinking

How to help:
- Explain concepts from the lesson notes
- Use Socratic nudges and hints so the student thinks
- Ask a short guiding question when stuck
- For ELA writing (RACECE): remind Restate, Answer, Cite, Explain, Cite again, Explain — without writing their full answer for them

CRITICAL — never do the work for them:
- NEVER paste a model / answer-key paragraph as something they should copy
- NEVER fill in the worksheet for them (no complete sample essays, no "here's what you should write")
- NEVER say which multiple-choice option is correct (not A/B/C/D, not the choice text as "the answer")
- NEVER give the final numeric/short-answer key while they are practicing
- You MAY restate the question in simpler words, remind a strategy, or walk through a similar worked example with different numbers/words
- If they ask "what's the answer?" or "just write it for me", give a hint path and one next step instead
- Private answer-key notes (if provided) are for YOU only — use them to guide; do not quote them verbatim as the student's answer

Scope:
- Only this lesson's topic and materials provided in the user message
- No open web chat, no personal questions, no collecting names/emails/addresses
- If asked something off-topic, gently redirect to the lesson

Reply with plain text only (no JSON, no markdown headings). Keep replies under ~120 words unless they need a short step-by-step.`;

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
  const history = (input.history ?? []).slice(-6);

  const contextBlock = [
    `Lesson title: ${input.lessonTitle}`,
    `Lesson notes (for tutoring — do not dump quiz or worksheet answers):\n${input.lessonContext}`,
    input.questionText
      ? `Current practice / worksheet question (stem only — do NOT reveal the finished answer):\n${input.questionText}`
      : "No active quiz/worksheet question right now — student is reviewing the lesson.",
    input.privateHints
      ? `PRIVATE answer-key / rubric notes (for coaching only — never paste as the student's work):\n${input.privateHints}`
      : null,
    "",
    `Student question:\n${input.userMessage}`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const contents: GeminiContent[] = [
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content.slice(0, 800) }],
    })),
    { role: "user", parts: [{ text: contextBlock }] },
  ];

  const reply = await generateGeminiText({
    featureLabel: "coaching",
    system: SYSTEM_PROMPT,
    contents,
    temperature: 0.5,
    maxOutputTokens: 350,
  });

  return reply.slice(0, 2000);
}
