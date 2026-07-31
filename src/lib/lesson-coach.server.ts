const GATEWAY_URL =
  process.env.AI_GATEWAY_URL ?? "https://api.openai.com/v1/chat/completions";

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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI coaching is not configured. Add OPENAI_API_KEY to your server environment (.env locally, or Netlify env vars), then restart the app.",
    );
  }

  const history = (input.history ?? []).slice(-6).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.slice(0, 800),
  }));

  const contextBlock = [
    `Lesson title: ${input.lessonTitle}`,
    `Lesson notes (for tutoring — do not dump quiz answers):\n${input.lessonContext}`,
    input.questionText
      ? `Current practice question (stem only — do NOT reveal the correct choice):\n${input.questionText}`
      : "No active quiz question right now — student is reviewing the lesson.",
    "",
    `Student question:\n${input.userMessage}`,
  ].join("\n");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 350,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: contextBlock },
      ],
    }),
  });

  if (response.status === 429) {
    throw new Error("The AI coach is busy right now. Please try again in a minute.");
  }
  if (response.status === 402) {
    throw new Error("AI credits are used up. Please add credits to keep coaching.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "AI coaching rejected the API key. Check OPENAI_API_KEY in your server environment.",
    );
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error("AI gateway error (lesson coach)", response.status, detail);
    throw new Error(
      "The AI coach could not reply. Check OPENAI_API_KEY / AI_MODEL and try again.",
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = String(payload.choices?.[0]?.message?.content ?? "").trim();
  if (!reply) {
    throw new Error("The AI coach returned an empty reply. Please try again.");
  }
  return reply.slice(0, 2000);
}
