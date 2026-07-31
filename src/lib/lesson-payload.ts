import type { ChoiceQuestion, Lesson, Question, ShortQuestion } from "@/lib/curriculum";

/** Fillable in-app worksheet field generated from an uploaded PDF. */
export type WorksheetField = {
  id: string;
  type: "short" | "numeric" | "multipart";
  prompt: string;
  placeholder?: string;
  /** Multi-part blanks under one prompt. */
  parts?: Array<{ id: string; prompt: string; placeholder?: string }>;
  /** Hidden coaching notes for the AI grader (not shown to students). */
  gradingHint?: string;
};

export type LessonWorksheet = {
  title?: string;
  instructions?: string;
  fields: WorksheetField[];
};

/** Stored on tasks.lesson_payload — mirrors Lesson plus optional fillable worksheet. */
export type LessonPayload = {
  unitTag: string;
  title: string;
  teach: string[];
  tip: string;
  passPercent: number;
  questions: Question[];
  transcript?: string;
  sourceCredit?: string;
  worksheet?: LessonWorksheet;
};

/** Per-field student response: scribble image and/or typed notes. */
export type WorksheetFieldAnswer = {
  /** Optional typed answer / notes. */
  text?: string;
  /** Multipart typed blanks. */
  parts?: Record<string, string>;
  /** JPEG/PNG data URL from the scribble pad (finger / Apple Pencil). */
  scribble?: string;
};

export type WorksheetAnswers = Record<
  string,
  string | Record<string, string> | WorksheetFieldAnswer
>;

export type WorksheetAiFeedback = {
  score: number;
  strengths: string;
  improvements: string;
  field_notes: Record<string, string>;
  teacher_note: string;
};

/** Normalize legacy string/parts answers into WorksheetFieldAnswer. */
export function normalizeFieldAnswer(
  value: string | Record<string, string> | WorksheetFieldAnswer | undefined,
): WorksheetFieldAnswer {
  if (value == null) return {};
  if (typeof value === "string") return { text: value };
  if (typeof value !== "object" || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  if ("scribble" in obj || "text" in obj || "parts" in obj) {
    return {
      text: typeof obj.text === "string" ? obj.text : undefined,
      parts:
        obj.parts && typeof obj.parts === "object" && !Array.isArray(obj.parts)
          ? (obj.parts as Record<string, string>)
          : undefined,
      scribble: typeof obj.scribble === "string" ? obj.scribble : undefined,
    };
  }
  // Legacy multipart map: { partId: "..." }
  return { parts: value as Record<string, string> };
}

export function fieldAnswerHasContent(answer: WorksheetFieldAnswer, multipart = false): boolean {
  if (answer.scribble && answer.scribble.startsWith("data:image/")) return true;
  if (multipart) {
    const parts = answer.parts ?? {};
    return Object.values(parts).some((v) => String(v ?? "").trim().length > 0);
  }
  return Boolean(String(answer.text ?? "").trim());
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter(Boolean);
}

function parseChoice(raw: unknown, index: number): ChoiceQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  const choices = asStringArray(q.choices);
  if (choices.length < 2) return null;
  const correctIndex = Number(q.correctIndex);
  if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
    return null;
  }
  return {
    id: asString(q.id, `q${index + 1}`),
    type: "choice",
    prompt: asString(q.prompt, `Question ${index + 1}`),
    choices,
    correctIndex,
    explanation: asString(q.explanation, "Review the lesson notes and try again."),
  };
}

function parseShort(raw: unknown, index: number): ShortQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  const accepted = asStringArray(q.accepted);
  if (!accepted.length) return null;
  return {
    id: asString(q.id, `q${index + 1}`),
    type: "short",
    prompt: asString(q.prompt, `Question ${index + 1}`),
    accepted,
    explanation: asString(q.explanation, "Review the lesson notes and try again."),
    placeholder: asString(q.placeholder) || undefined,
  };
}

function parseQuestion(raw: unknown, index: number): Question | null {
  if (!raw || typeof raw !== "object") return null;
  const type = (raw as Record<string, unknown>).type;
  if (type === "short") return parseShort(raw, index);
  return parseChoice(raw, index);
}

function parseWorksheetField(raw: unknown, index: number): WorksheetField | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  const typeRaw = asString(f.type, "short");
  const type: WorksheetField["type"] =
    typeRaw === "numeric" || typeRaw === "multipart" ? typeRaw : "short";
  const partsRaw = Array.isArray(f.parts) ? f.parts : [];
  const parts = partsRaw
    .map((p, i) => {
      if (!p || typeof p !== "object") return null;
      const part = p as Record<string, unknown>;
      return {
        id: asString(part.id, `p${i + 1}`),
        prompt: asString(part.prompt, `Part ${i + 1}`),
        placeholder: asString(part.placeholder) || undefined,
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return {
    id: asString(f.id, `w${index + 1}`),
    type,
    prompt: asString(f.prompt, `Prompt ${index + 1}`),
    placeholder: asString(f.placeholder) || undefined,
    parts: type === "multipart" && parts.length ? parts : undefined,
    gradingHint: asString(f.gradingHint) || undefined,
  };
}

/** Normalize / validate JSON from Gemini or the database into LessonPayload. */
export function parseLessonPayload(raw: unknown): LessonPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const questionsRaw = Array.isArray(obj.questions) ? obj.questions : [];
  const questions = questionsRaw
    .map((q, i) => parseQuestion(q, i))
    .filter((q): q is Question => Boolean(q));

  if (questions.length < 1) return null;

  // Prefer exactly 5 choice questions for AI drafts; keep any valid mix if already stored.
  const teach = asStringArray(obj.teach);
  const worksheetRaw =
    obj.worksheet && typeof obj.worksheet === "object"
      ? (obj.worksheet as Record<string, unknown>)
      : null;
  const fieldsRaw = worksheetRaw && Array.isArray(worksheetRaw.fields) ? worksheetRaw.fields : [];
  const fields = fieldsRaw
    .map((f, i) => parseWorksheetField(f, i))
    .filter((f): f is WorksheetField => Boolean(f));

  const passPercent = Math.max(
    50,
    Math.min(100, Math.round(Number(obj.passPercent ?? 70)) || 70),
  );

  return {
    unitTag: asString(obj.unitTag, "CUSTOM_WORKSHEET"),
    title: asString(obj.title, "Worksheet lesson"),
    teach: teach.length ? teach : ["Read the worksheet carefully, then answer the practice questions."],
    tip: asString(obj.tip, "Show your work and check each answer before moving on."),
    passPercent,
    questions,
    transcript: asString(obj.transcript) || undefined,
    sourceCredit: asString(obj.sourceCredit) || undefined,
    worksheet: fields.length
      ? {
          title: asString(worksheetRaw?.title) || undefined,
          instructions: asString(worksheetRaw?.instructions) || undefined,
          fields,
        }
      : undefined,
  };
}

export function lessonFromPayload(payload: LessonPayload): Lesson {
  return {
    unitTag: payload.unitTag,
    title: payload.title,
    teach: payload.teach,
    tip: payload.tip,
    passPercent: payload.passPercent,
    questions: payload.questions,
    transcript: payload.transcript,
  };
}

/** Prefer task.lesson_payload when present; else static curriculum lookup. */
export function resolveLessonForTask(task: {
  unit_tag?: string | null;
  lesson_payload?: unknown;
}): { lesson: Lesson; payload: LessonPayload | null } | null {
  const payload = parseLessonPayload(task.lesson_payload);
  if (payload) {
    return { lesson: lessonFromPayload(payload), payload };
  }
  // Lazy import avoided — callers that need curriculum should pass unit_tag through lessonForUnit.
  return null;
}

export function hasFillableWorksheet(payload: LessonPayload | null | undefined): boolean {
  return Boolean(payload?.worksheet?.fields?.length);
}
