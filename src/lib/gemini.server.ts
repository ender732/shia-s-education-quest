/**
 * Google Gemini (Generative Language API) helpers — server-only.
 * Env: GEMINI_API_KEY (preferred) or GOOGLE_GENERATIVE_AI_API_KEY.
 * Model: GEMINI_MODEL or AI_MODEL (default gemini-3.1-flash-lite — free-tier friendly).
 * Gemini 2.5 Flash is blocked for many new API keys ("no longer available to new users").
 */

/** Best free-tier default for new Google AI Studio keys (Jul 2026+). */
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
/** Short fallback chain — prefer lite models to stretch free quota. */
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Models that fail for new free-tier keys or burn quota poorly. */
const FREE_TIER_AVOID = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
]);

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export function getGeminiApiKey(): string {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI is not configured. Add GEMINI_API_KEY to your server environment (.env locally, or Netlify env vars for Builds/Functions/Runtime), then restart the app.",
    );
  }
  return apiKey;
}

/** Normalize model ids from Netlify/UI (strip quotes, "models/" prefix, whitespace). */
export function normalizeGeminiModel(raw: string | undefined | null): string {
  let model = String(raw ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
  if (model.toLowerCase().startsWith("models/")) {
    model = model.slice("models/".length);
  }
  return model;
}

export function getGeminiModel(): string {
  const configured =
    normalizeGeminiModel(process.env.GEMINI_MODEL) ||
    normalizeGeminiModel(process.env.AI_MODEL);
  if (!configured) return DEFAULT_MODEL;
  if (FREE_TIER_AVOID.has(configured)) {
    console.warn(
      `[gemini] Replacing unavailable/legacy model “${configured}” with ${DEFAULT_MODEL}`,
    );
    return DEFAULT_MODEL;
  }
  return configured;
}

function missingKeyMessage(feature: string): string {
  return `AI ${feature} is not configured. Add GEMINI_API_KEY to your server environment (.env locally, or Netlify env vars for Builds/Functions/Runtime), then restart the app.`;
}

export function requireGeminiApiKey(feature: string): string {
  try {
    return getGeminiApiKey();
  } catch {
    throw new Error(missingKeyMessage(feature));
  }
}

/** Parse a data URL into Gemini inlineData, or null if invalid / too large. */
export function dataUrlToInlinePart(
  dataUrl: string,
  maxLength = 900_000,
): GeminiPart | null {
  if (!dataUrl.startsWith("data:image/") || dataUrl.length > maxLength) return null;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

export function parseJsonFromModelText(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("The AI returned an unreadable answer. Please try again.");
    }
    return JSON.parse(match[0]) as unknown;
  }
}

type GenerateOptions = {
  system: string;
  contents: GeminiContent[];
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  /**
   * Gemini 2.5+ thinking budget. Thinking tokens count against maxOutputTokens.
   * Default 0 (off) so short replies are not emptied by MAX_TOKENS.
   */
  thinkingBudget?: number;
  /** Used in user-facing error strings (e.g. "grading", "coaching"). */
  featureLabel: string;
};

type GeminiPartResponse = {
  text?: string;
  /** Thought / reasoning parts — not shown to students. */
  thought?: boolean;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPartResponse[] };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string; code?: number };
};

function extractVisibleText(payload: GeminiGenerateResponse): string {
  return (payload.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

function extractGeminiErrorMessage(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { error?: { message?: string } };
    const msg = parsed.error?.message?.trim();
    if (msg) return msg.slice(0, 280);
  } catch {
    /* plain text body */
  }
  return detail.replace(/\s+/g, " ").trim().slice(0, 280);
}

function isModelMissingError(status: number, detail: string): boolean {
  if (status === 404) return true;
  return /not found|is not supported|NOT_FOUND|invalid model|no longer available to new users|please update your code to use a newer model/i.test(
    detail,
  );
}

function buildGenerationConfig(options: GenerateOptions): Record<string, unknown> {
  const thinkingBudget = options.thinkingBudget ?? 0;
  return {
    temperature: options.temperature ?? 0.4,
    maxOutputTokens: options.maxOutputTokens ?? 1024,
    ...(options.json ? { responseMimeType: "application/json" } : {}),
    thinkingConfig: { thinkingBudget },
  };
}

async function callGeminiOnce(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<
  | { ok: true; text: string; finishReason: string }
  | { ok: false; status: number; detail: string; truncatedText?: string }
> {
  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const detail = await response.text().catch(() => "");

  if (!response.ok) {
    return { ok: false, status: response.status, detail };
  }

  let payload: GeminiGenerateResponse;
  try {
    payload = JSON.parse(detail) as GeminiGenerateResponse;
  } catch {
    return { ok: false, status: 502, detail: "Invalid JSON from Gemini." };
  }

  const finishReason = payload.candidates?.[0]?.finishReason ?? "STOP";
  const text = extractVisibleText(payload);

  if (!text) {
    return {
      ok: false,
      status: 502,
      detail: `Empty model reply (finishReason=${finishReason}).`,
    };
  }

  // Partial reply cut off by the token ceiling — do not treat as success.
  if (finishReason === "MAX_TOKENS") {
    return {
      ok: false,
      status: 502,
      detail: `Truncated model reply (finishReason=MAX_TOKENS).`,
      truncatedText: text,
    };
  }

  return { ok: true, text, finishReason };
}

function modelsToTry(primary: string): string[] {
  const list = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  return [...new Set(list)];
}

function isTruncationError(detail: string): boolean {
  return /Truncated model reply|Empty model reply \(finishReason=MAX_TOKENS\)/i.test(
    detail,
  );
}

export async function generateGeminiText(options: GenerateOptions): Promise<string> {
  const apiKey = requireGeminiApiKey(options.featureLabel);
  const primaryModel = getGeminiModel();
  const baseMax = options.maxOutputTokens ?? 1024;

  // Free tier: one primary attempt, one modest retry on truncation (no huge 8k burns).
  const attempts: Array<{ maxOutputTokens: number; thinkingBudget: number }> = [
    {
      maxOutputTokens: baseMax,
      thinkingBudget: options.thinkingBudget ?? 0,
    },
    {
      maxOutputTokens: Math.min(Math.max(baseMax * 2, 1536), 2048),
      thinkingBudget: 0,
    },
  ];

  let lastStatus = 0;
  let lastDetail = "";
  let lastModel = primaryModel;
  let partialText = "";
  let stopAll = false;

  for (let attemptIndex = 0; attemptIndex < attempts.length && !stopAll; attemptIndex++) {
    const attempt = attempts[attemptIndex];
    const body: Record<string, unknown> = {
      systemInstruction: {
        parts: [{ text: options.system }],
      },
      contents: options.contents,
      generationConfig: buildGenerationConfig({
        ...options,
        maxOutputTokens: attempt.maxOutputTokens,
        thinkingBudget: attempt.thinkingBudget,
      }),
    };

    for (const model of modelsToTry(primaryModel)) {
      lastModel = model;
      const result = await callGeminiOnce(apiKey, model, body);
      if (result.ok) return result.text;

      lastStatus = result.status;
      lastDetail = result.detail;
      if (result.truncatedText) partialText = result.truncatedText;
      console.error(
        `Gemini API error (${options.featureLabel})`,
        model,
        result.status,
        result.detail.slice(0, 500),
      );

      if (isModelMissingError(result.status, result.detail)) {
        continue;
      }
      if (isTruncationError(result.detail) && attemptIndex < attempts.length - 1) {
        break;
      }
      stopAll = true;
      break;
    }
  }

  // Last resort: ask the model to finish a truncated draft in one more call.
  if (partialText && isTruncationError(lastDetail)) {
    const continuation = await callGeminiOnce(apiKey, lastModel, {
      systemInstruction: {
        parts: [
          {
            text: `${options.system}\n\nIMPORTANT: Continue the draft below and finish the FULL reply in one message. Do not restart. Do not stop mid-sentence.`,
          },
        ],
      },
      contents: [
        ...options.contents,
        { role: "model", parts: [{ text: partialText }] },
        {
          role: "user",
          parts: [
            {
              text: "Continue exactly from where you stopped and finish your complete reply now.",
            },
          ],
        },
      ],
      generationConfig: buildGenerationConfig({
        ...options,
        maxOutputTokens: Math.min(Math.max(baseMax * 2, 1536), 2048),
        thinkingBudget: 0,
      }),
    });
    if (continuation.ok) {
      const draft = partialText.trimEnd();
      const more = continuation.text.trim();
      if (more.toLowerCase().startsWith(draft.slice(0, 24).toLowerCase())) {
        return more.slice(0, 4000);
      }
      const joiner = /[\s([{/-]$/.test(draft) ? "" : " ";
      return `${draft}${joiner}${more}`.slice(0, 4000);
    }
  }

  if (lastStatus === 429) {
    const mentionsZeroQuota = /limit:\s*0/i.test(lastDetail);
    const mentionsOldFlash =
      /gemini-2\.0-flash/i.test(lastDetail) || /gemini-2\.0-flash/i.test(lastModel);
    if (mentionsZeroQuota || mentionsOldFlash) {
      throw new Error(
        `AI ${options.featureLabel} hit a Gemini quota limit for model “${lastModel}”. In Netlify, set GEMINI_MODEL to gemini-3.1-flash-lite, confirm GEMINI_API_KEY in Google AI Studio, then try again.`,
      );
    }
    throw new Error(
      `The AI ${options.featureLabel} is rate-limited right now. Wait a minute, or check your Gemini quota in Google AI Studio.`,
    );
  }

  if (lastStatus === 401 || lastStatus === 403) {
    throw new Error(
      `AI ${options.featureLabel} rejected the API key. Check GEMINI_API_KEY in your Netlify environment (and that the Generative Language API is enabled for that key).`,
    );
  }

  const geminiMsg = extractGeminiErrorMessage(lastDetail);
  if (isModelMissingError(lastStatus, lastDetail)) {
    throw new Error(
      `AI ${options.featureLabel} could not use model “${lastModel}”. Set GEMINI_MODEL=gemini-3.1-flash-lite in Netlify (no quotes). ${geminiMsg}`,
    );
  }

  if (isTruncationError(lastDetail)) {
    // Better to return a stitched partial than fail hard if we have usable text.
    if (partialText.trim().length > 40) {
      return `${partialText.trim()}…`;
    }
    throw new Error(
      `The AI ${options.featureLabel} ran out of reply space before finishing. Try a shorter question, or set GEMINI_MODEL=gemini-3.1-flash-lite in Netlify.`,
    );
  }

  throw new Error(
    `The AI could not complete ${options.featureLabel} (model “${lastModel}”, HTTP ${lastStatus}). ${geminiMsg || "Check GEMINI_API_KEY / GEMINI_MODEL in Netlify."}`,
  );
}

export async function generateGeminiJson(
  options: Omit<GenerateOptions, "json">,
): Promise<unknown> {
  const raw = await generateGeminiText({ ...options, json: true });
  return parseJsonFromModelText(raw);
}
