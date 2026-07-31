const GATEWAY_URL =
  process.env.AI_GATEWAY_URL ?? "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are "AI Teacher", an experienced NYC District 6 / P.S./I.S. 187 Hudson Cliffs 5th-grade ELA teacher.

Grade the student's written response strictly against NYC 5th-grade ELA standards and the RACECE framework:
R - Restate the question
A - Answer the question directly
C - Cite text evidence (first citation)
E - Explain that evidence
C - Cite a second piece of text evidence
E - Explain that second piece of evidence

Also judge paragraphing, conventions (spelling/grammar/capitalization), and genuine reading comprehension.

Be warm and encouraging but honest — this is a 10-year-old student. Keep every sentence short and readable by a 5th grader.

Return ONLY valid JSON matching exactly this shape:
{
  "score": <integer 0-100>,
  "strengths": "<2-4 sentences naming what the student did well>",
  "improvements": "<2-4 sentences of specific, actionable next steps>",
  "racece_checklist": {
    "restate": <true|false>,
    "answer": <true|false>,
    "cite_1": <true|false>,
    "explain_1": <true|false>,
    "cite_2": <true|false>,
    "explain_2": <true|false>
  },
  "teacher_note": "<one short motivating sentence>"
}`;

export type AiFeedback = {
  score: number;
  strengths: string;
  improvements: string;
  racece_checklist: Record<string, boolean>;
  teacher_note: string;
};

export async function gradeWithAi(input: {
  bookTitle: string;
  chapter: string;
  reportText: string;
}): Promise<AiFeedback> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI grading is not configured. Add OPENAI_API_KEY to your server environment (.env locally, or Netlify env vars), then restart the app.",
    );
  }

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Book: ${input.bookTitle || "(not given)"}\nChapter / Topic: ${
            input.chapter || "(not given)"
          }\n\nStudent response:\n"""\n${input.reportText}\n"""`,
        },
      ],
    }),
  });

  if (response.status === 429) {
    throw new Error("The AI teacher is busy right now. Please try again in a minute.");
  }
  if (response.status === 402) {
    throw new Error("AI credits are used up. Please add credits to keep grading.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "AI grading rejected the API key. Check OPENAI_API_KEY in your server environment.",
    );
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error("AI gateway error", response.status, detail);
    throw new Error(
      "The AI teacher could not grade this report. Check OPENAI_API_KEY / AI_MODEL and try again.",
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";

  let parsed: Partial<AiFeedback>;
  try {
    parsed = JSON.parse(raw) as Partial<AiFeedback>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("The AI teacher returned an unreadable answer. Please try again.");
    parsed = JSON.parse(match[0]) as Partial<AiFeedback>;
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));

  return {
    score,
    strengths: String(parsed.strengths ?? "").trim(),
    improvements: String(parsed.improvements ?? "").trim(),
    racece_checklist: (parsed.racece_checklist ?? {}) as Record<string, boolean>,
    teacher_note: String(parsed.teacher_note ?? "").trim(),
  };
}

export function xpForScore(score: number) {
  if (score >= 90) return 250;
  if (score >= 80) return 200;
  if (score >= 70) return 150;
  if (score >= 60) return 100;
  return 75;
}

const WORKSHEET_SYSTEM_PROMPT = `You are "AI Teacher", an experienced NYC District 6 / P.S./I.S. 187 Hudson Cliffs 5th-grade teacher.

Grade the student's worksheet answers against the prompts and grading hints provided.
Students may submit handwritten / drawn work as images (finger or stylus scribble) and/or typed notes.
Read any attached images carefully — treat handwriting and drawings as the student's work.

Be warm and encouraging but honest — this is a 10-year-old. Keep every sentence short and readable.

Scoring:
- 90–100: essentially correct / complete
- 70–89: mostly correct; minor mistakes
- 50–69: partial understanding; needs another try
- below 50: mostly incorrect or blank

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "strengths": "<2-4 short sentences>",
  "improvements": "<2-4 specific next steps>",
  "field_notes": { "<fieldId>": "<one short note for that field>" },
  "teacher_note": "<one motivating sentence>"
}`;

export type WorksheetGradeFeedback = {
  score: number;
  strengths: string;
  improvements: string;
  field_notes: Record<string, string>;
  teacher_note: string;
};

type WorksheetFieldForGrade = {
  id: string;
  type: string;
  prompt: string;
  gradingHint?: string;
  parts?: Array<{ id: string; prompt: string }>;
};

type NormalizedStudentAnswer = {
  text?: string;
  parts?: Record<string, string>;
  hasScribble: boolean;
};

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

function stripHeavyScribblesForJson(
  answers: Record<string, { text?: string; parts?: Record<string, string>; scribble?: string }>,
): Record<string, NormalizedStudentAnswer> {
  const out: Record<string, NormalizedStudentAnswer> = {};
  for (const [id, ans] of Object.entries(answers)) {
    out[id] = {
      text: ans.text,
      parts: ans.parts,
      hasScribble: Boolean(ans.scribble?.startsWith("data:image/")),
    };
  }
  return out;
}

export async function gradeWorksheetWithAi(input: {
  lessonTitle: string;
  worksheetTitle?: string;
  fields: WorksheetFieldForGrade[];
  answers: Record<string, { text?: string; parts?: Record<string, string>; scribble?: string }>;
}): Promise<WorksheetGradeFeedback> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI grading is not configured. Add OPENAI_API_KEY to your server environment (.env locally, or Netlify env vars), then restart the app.",
    );
  }

  const textPayload = {
    lessonTitle: input.lessonTitle,
    worksheetTitle: input.worksheetTitle ?? null,
    fields: input.fields,
    studentAnswers: stripHeavyScribblesForJson(input.answers),
    note: "Images attached below are the student's handwritten/drawn work for fields marked hasScribble=true.",
  };

  const content: ChatContentPart[] = [
    { type: "text", text: JSON.stringify(textPayload, null, 2) },
  ];

  for (const field of input.fields) {
    const scribble = input.answers[field.id]?.scribble;
    if (!scribble?.startsWith("data:image/")) continue;
    // Cap very large payloads — vision models accept data URLs.
    if (scribble.length > 900_000) continue;
    content.push({
      type: "text",
      text: `Handwriting / drawing for field "${field.id}" (${field.prompt}):`,
    });
    content.push({
      type: "image_url",
      image_url: { url: scribble, detail: "high" },
    });
  }

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // gpt-4o-mini supports vision; override with AI_MODEL if needed.
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: WORKSHEET_SYSTEM_PROMPT },
        { role: "user", content },
      ],
    }),
  });

  if (response.status === 429) {
    throw new Error("The AI teacher is busy right now. Please try again in a minute.");
  }
  if (response.status === 402) {
    throw new Error("AI credits are used up. Please add credits to keep grading.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "AI grading rejected the API key. Check OPENAI_API_KEY in your server environment.",
    );
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error("AI gateway error (worksheet)", response.status, detail);
    throw new Error(
      "The AI teacher could not grade this worksheet. Check OPENAI_API_KEY / AI_MODEL and try again.",
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";

  let parsed: Partial<WorksheetGradeFeedback>;
  try {
    parsed = JSON.parse(raw) as Partial<WorksheetGradeFeedback>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("The AI teacher returned an unreadable answer. Please try again.");
    parsed = JSON.parse(match[0]) as Partial<WorksheetGradeFeedback>;
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));
  const fieldNotes =
    parsed.field_notes && typeof parsed.field_notes === "object"
      ? (parsed.field_notes as Record<string, string>)
      : {};

  return {
    score,
    strengths: String(parsed.strengths ?? "").trim(),
    improvements: String(parsed.improvements ?? "").trim(),
    field_notes: fieldNotes,
    teacher_note: String(parsed.teacher_note ?? "").trim(),
  };
}
