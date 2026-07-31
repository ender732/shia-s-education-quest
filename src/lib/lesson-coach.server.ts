import {
  generateGeminiText,
  type GeminiContent,
} from "@/lib/gemini.server";

const SYSTEM_PROMPT = `You are "AI Coach", a warm NYC District 6 / P.S./I.S. 187 Hudson Cliffs Grade 5 tutor.

Your job: help a 5th grader understand the CURRENT LESSON only. Stay on-topic.

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

CRITICAL — quiz / practice mode:
- NEVER say which multiple-choice option is correct (not A/B/C/D, not the choice text as "the answer")
- NEVER give the final numeric/short-answer key while they are practicing
- You MAY restate the question in simpler words, remind a strategy, or walk through a similar worked example with different numbers/words
- If they ask "what's the answer?", give a hint path instead

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
  userMessage: string;
  history?: CoachHistoryMessage[];
}): Promise<string> {
  const history = (input.history ?? []).slice(-6);

  const contextBlock = [
    `Lesson title: ${input.lessonTitle}`,
    `Lesson notes (for tutoring — do not dump quiz answers):\n${input.lessonContext}`,
    input.questionText
      ? `Current practice question (stem only — do NOT reveal the correct choice):\n${input.questionText}`
      : "No active quiz question right now — student is reviewing the lesson.",
    "",
    `Student question:\n${input.userMessage}`,
  ].join("\n");

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
