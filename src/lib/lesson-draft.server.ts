import { generateGeminiJson } from "@/lib/gemini.server";
import { parseLessonPayload, type LessonPayload } from "@/lib/lesson-payload";
import {
  buildFallbackTranscript,
  matchLessonVideo,
} from "@/lib/lesson-videos";
import { isValidYoutubeId } from "@/lib/youtube";

/**
 * Load unpdf (and its serverless PDF.js build) only inside Node handlers.
 * Do not import browser `pdfjs-dist` — that crashes Netlify with DOMMatrix.
 */
async function loadUnpdf() {
  const unpdf = await import("unpdf");
  return unpdf;
}

const SYSTEM_PROMPT = `You are an expert NYC Grade 5 (P.S./I.S. 187 Hudson Cliffs) curriculum designer.

A parent uploaded a worksheet/lesson PDF they are allowed to use. From the extracted text, draft a structured practice lesson for a 10-year-old.

CRITICAL — answer keys vs student work:
- PDFs often include an "Answers:" / answer-key page (sample responses, "Answers will vary", model paragraphs).
- Students must FILL the worksheet themselves. Never pre-write their answers.
- Put answer-key / sample responses ONLY in each field's gradingHint (hidden from students; used by the AI grader and coach).
- Student-facing prompt, placeholder, teach, tip, and transcript must NEVER contain answer-key text, sample essays, or "Answers will vary" keys.
- worksheet.fields[].prompt = the QUESTION only (what the student should answer). Leave the response blank for the student.
- placeholder = a short blank cue like "Write your answer here" — not a model answer.

Other rules:
- Do NOT invent copyrighted passages beyond what the extract supports; stay faithful to the worksheet.
- Produce exactly 5 multiple-choice questions (type "choice") with 4 choices each and one correctIndex (0-3).
- Also produce a fillable worksheet section with 3–6 in-app fields the student will write/draw into on the website (finger, Apple Pencil, or typed notes — NOT PDF annotation). Use types: "short", "numeric", or "multipart".
- Include gradingHint on every worksheet field: expected answers, acceptable alternatives, or rubric notes from the PDF answer key when present.
- teach / transcript: story, passage, and instructions only — strip any Answers section.
- ALWAYS include transcript: a readable 1–2 paragraph student reading version of the lesson (no answer key). This is shown under the video.
- Keep language warm, clear, and grade-appropriate.
- passPercent must be 70.
- Do NOT invent YouTube video IDs. Video matching is handled separately by the app.

Return ONLY valid JSON matching this shape:
{
  "unitTag": "<short slug like CUSTOM_MATH_FRACTIONS>",
  "title": "<lesson title>",
  "teach": ["<2-5 short teaching bullet paragraphs — no answer key>"],
  "tip": "<one coach tip — strategy, not the answer>",
  "transcript": "<required readable lesson reading text — never the Answers page>",
  "passPercent": 70,
  "questions": [
    {
      "id": "q1",
      "type": "choice",
      "prompt": "...",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ],
  "worksheet": {
    "title": "<worksheet title>",
    "instructions": "<what the student should do — not the answers>",
    "fields": [
      {
        "id": "w1",
        "type": "short",
        "prompt": "<question only>",
        "placeholder": "Write your answer here",
        "gradingHint": "<from answer key / rubric — students never see this>"
      },
      {
        "id": "w2",
        "type": "numeric",
        "prompt": "<question only>",
        "placeholder": "e.g. a number",
        "gradingHint": "<expected number or method>"
      },
      {
        "id": "w3",
        "type": "multipart",
        "prompt": "<question only>",
        "parts": [
          { "id": "a", "prompt": "Part A", "placeholder": "Your answer" },
          { "id": "b", "prompt": "Part B", "placeholder": "Your answer" }
        ],
        "gradingHint": "<answer-key notes for parts>"
      }
    ]
  }
}`;

async function callGeminiJson(system: string, user: string): Promise<unknown> {
  return generateGeminiJson({
    featureLabel: "lesson drafting",
    system,
    contents: [{ role: "user", parts: [{ text: user }] }],
    maxOutputTokens: 4096,
  });
}

/** Extract plain text from a PDF buffer. Throws a clear error for scan-only PDFs. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await loadUnpdf();
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    const text = String(result.text ?? "")
      .replace(/\u0000/g, "")
      .trim();

    if (text.length < 80) {
      throw new Error(
        "Could not extract enough text from this PDF. Please upload a text-based (not scanned image-only) PDF.",
      );
    }
    // Cap for model context
    return text.slice(0, 24000);
  } catch (err) {
    if (err instanceof Error && /Could not extract enough text/i.test(err.message)) {
      throw err;
    }
    if (err instanceof Error && /DOMMatrix/i.test(err.message)) {
      console.error("[extractPdfText] browser pdfjs loaded in Node", err);
      throw new Error(
        "PDF text extraction is misconfigured on the server. Please try again later.",
      );
    }
    console.error("[extractPdfText]", err);
    throw new Error(
      "Could not read this PDF. Please upload a text-based PDF worksheet (not a scanned image-only file).",
    );
  }
}

export async function draftLessonFromPdfText(input: {
  pdfText: string;
  subjectHint?: string;
  sourceCredit?: string;
  titleHint?: string;
}): Promise<LessonPayload> {
  const parsed = await callGeminiJson(
    SYSTEM_PROMPT,
    [
      input.subjectHint ? `Subject hint: ${input.subjectHint}` : null,
      input.titleHint ? `Preferred title: ${input.titleHint}` : null,
      input.sourceCredit ? `Source credit to preserve: ${input.sourceCredit}` : null,
      "",
      "Extracted PDF text:",
      '"""',
      input.pdfText,
      '"""',
    ]
      .filter((line) => line !== null)
      .join("\n"),
  );

  const payload = parseLessonPayload(parsed);
  if (!payload) {
    throw new Error("The AI draft was incomplete. Please try generating again.");
  }

  // Ensure we have 5 MCQs when possible — pad is not ideal; reject if fewer than 5 choice qs
  const choiceQs = payload.questions.filter((q) => q.type === "choice");
  if (choiceQs.length < 5) {
    throw new Error(
      "The AI draft did not include 5 multiple-choice questions. Please try generating again.",
    );
  }
  payload.questions = choiceQs.slice(0, 5);

  if (!payload.worksheet?.fields?.length) {
    throw new Error(
      "The AI draft did not include fillable worksheet fields. Please try generating again.",
    );
  }

  if (input.sourceCredit) {
    payload.sourceCredit = input.sourceCredit;
  }

  // Safety net: never leave answer-key pages in student-facing text.
  payload.teach = payload.teach.map(stripAnswerKeySection).filter(Boolean);
  if (!payload.teach.length) {
    payload.teach = ["Read the worksheet carefully, then answer the practice questions."];
  }
  if (payload.transcript) {
    payload.transcript = stripAnswerKeySection(payload.transcript) || undefined;
  }
  payload.tip = stripAnswerKeySection(payload.tip);
  if (payload.worksheet) {
    payload.worksheet.instructions = payload.worksheet.instructions
      ? stripAnswerKeySection(payload.worksheet.instructions) || undefined
      : undefined;
    payload.worksheet.fields = payload.worksheet.fields.map((field) => ({
      ...field,
      prompt: stripEmbeddedAnswerFromPrompt(field.prompt),
      placeholder: sanitizePlaceholder(field.placeholder, field.type),
      parts: field.parts?.map((part) => ({
        ...part,
        prompt: stripEmbeddedAnswerFromPrompt(part.prompt),
        placeholder: sanitizePlaceholder(part.placeholder, "short"),
      })),
    }));
  }

  // Attach a curated YouTube explainer + ensure a student transcript exists.
  // Never trust model-invented video IDs.
  if (!isValidYoutubeId(payload.youtubeVideoId)) {
    payload.youtubeVideoId = undefined;
    payload.youtubeTitle = undefined;
    payload.youtubeChannel = undefined;
  }

  const matched = matchLessonVideo({
    title: payload.title,
    teach: payload.teach,
    tip: payload.tip,
    unitTag: payload.unitTag,
    subjectHint: input.subjectHint,
    pdfExcerpt: input.pdfText,
  });

  if (matched) {
    payload.youtubeVideoId = matched.youtubeVideoId;
    payload.youtubeTitle = matched.youtubeTitle;
    payload.youtubeChannel = matched.youtubeChannel;
    // Prefer draft transcript when present; otherwise use the catalog reading text.
    if (!payload.transcript?.trim()) {
      payload.transcript = matched.transcript;
    }
  }

  if (!payload.transcript?.trim()) {
    payload.transcript = buildFallbackTranscript({
      title: payload.title,
      teach: payload.teach,
      tip: payload.tip,
    });
  }

  payload.passPercent = 70;
  return payload;
}

/** Drop everything from a common "Answers:" heading onward. */
function stripAnswerKeySection(text: string): string {
  const cut = text.search(/\n\s*answers?\s*:/i);
  if (cut >= 0) return text.slice(0, cut).trim();
  if (/^\s*answers?\s*:/i.test(text)) return "";
  return text.trim();
}

/**
 * If a prompt looks like "Question… Answer: …", keep the question only.
 * Full answer keys belong in gradingHint, not the student prompt.
 */
function stripEmbeddedAnswerFromPrompt(prompt: string): string {
  const cut = prompt.search(/\n\s*(answer|answers|sample response|expected)\s*:/i);
  if (cut >= 0) return prompt.slice(0, cut).trim();
  return prompt.trim();
}

function sanitizePlaceholder(
  placeholder: string | undefined,
  type: "short" | "numeric" | "multipart",
): string | undefined {
  const raw = (placeholder ?? "").trim();
  if (!raw) {
    return type === "numeric" ? "Write the number here" : "Write your answer here";
  }
  // Reject placeholders that look like completed answers / answer keys.
  if (
    /answers?\s+will\s+vary/i.test(raw) ||
    /^(expected|answer|sample)\b/i.test(raw) ||
    raw.length > 80
  ) {
    return type === "numeric" ? "Write the number here" : "Write your answer here";
  }
  return raw;
}
