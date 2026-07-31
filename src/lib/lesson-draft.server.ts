import { generateGeminiJson } from "@/lib/gemini.server";
import { parseLessonPayload, type LessonPayload } from "@/lib/lesson-payload";

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

Rules:
- Do NOT invent copyrighted passages beyond what the extract supports; stay faithful to the worksheet.
- Produce exactly 5 multiple-choice questions (type "choice") with 4 choices each and one correctIndex (0-3).
- Also produce a fillable worksheet section with 3–6 in-app fields the student will write/draw into on the website (finger, Apple Pencil, or typed notes — NOT PDF annotation). Use types: "short", "numeric", or "multipart".
- Include gradingHint on each worksheet field with expected answers / rubric notes for an AI grader (students will not see gradingHint).
- Keep language warm, clear, and grade-appropriate.
- passPercent must be 70.

Return ONLY valid JSON matching this shape:
{
  "unitTag": "<short slug like CUSTOM_MATH_FRACTIONS>",
  "title": "<lesson title>",
  "teach": ["<2-5 short teaching bullet paragraphs>"],
  "tip": "<one coach tip>",
  "transcript": "<optional longer reading/summary of the worksheet content>",
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
    "instructions": "<what to do>",
    "fields": [
      {
        "id": "w1",
        "type": "short",
        "prompt": "...",
        "placeholder": "...",
        "gradingHint": "Expected: ..."
      },
      {
        "id": "w2",
        "type": "numeric",
        "prompt": "...",
        "placeholder": "e.g.",
        "gradingHint": "Expected number: ..."
      },
      {
        "id": "w3",
        "type": "multipart",
        "prompt": "...",
        "parts": [
          { "id": "a", "prompt": "Part A", "placeholder": "..." },
          { "id": "b", "prompt": "Part B", "placeholder": "..." }
        ],
        "gradingHint": "..."
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

  payload.passPercent = 70;
  return payload;
}
