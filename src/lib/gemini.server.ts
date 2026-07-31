/**
 * Google Gemini (Generative Language API) helpers — server-only.
 * Env: GEMINI_API_KEY (preferred) or GOOGLE_GENERATIVE_AI_API_KEY.
 * Model: GEMINI_MODEL or AI_MODEL (default gemini-2.5-flash).
 * Avoid gemini-2.0-flash on free tier — Google often sets its quota to 0 (HTTP 429).
 */

const DEFAULT_MODEL = "gemini-2.5-flash";
/** Used if the configured model is missing / retired. */
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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
  return configured || DEFAULT_MODEL;
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
  /** Used in user-facing error strings (e.g. "grading", "coaching"). */
  featureLabel: string;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string; code?: number };
};

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
  return /not found|is not supported|NOT_FOUND|invalid model/i.test(detail);
}

async function callGeminiOnce(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; text: string } | { ok: false; status: number; detail: string }> {
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

  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const reason = payload.candidates?.[0]?.finishReason ?? "empty";
    return {
      ok: false,
      status: 502,
      detail: `Empty model reply (finishReason=${reason}).`,
    };
  }

  return { ok: true, text };
}

function modelsToTry(primary: string): string[] {
  const list = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  return [...new Set(list)];
}

export async function generateGeminiText(options: GenerateOptions): Promise<string> {
  const apiKey = requireGeminiApiKey(options.featureLabel);
  const primaryModel = getGeminiModel();

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: options.system }],
    },
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  let lastStatus = 0;
  let lastDetail = "";
  let lastModel = primaryModel;

  for (const model of modelsToTry(primaryModel)) {
    lastModel = model;
    const result = await callGeminiOnce(apiKey, model, body);
    if (result.ok) return result.text;

    lastStatus = result.status;
    lastDetail = result.detail;
    console.error(
      `Gemini API error (${options.featureLabel})`,
      model,
      result.status,
      result.detail.slice(0, 500),
    );

    // Retry next fallback only when this model is missing / unsupported.
    if (!isModelMissingError(result.status, result.detail)) {
      break;
    }
  }

  if (lastStatus === 429) {
    const mentionsZeroQuota = /limit:\s*0/i.test(lastDetail);
    const mentionsOldFlash =
      /gemini-2\.0-flash/i.test(lastDetail) || /gemini-2\.0-flash/i.test(lastModel);
    if (mentionsZeroQuota || mentionsOldFlash) {
      throw new Error(
        `AI ${options.featureLabel} hit a Gemini quota limit for model “${lastModel}”. In Netlify, set GEMINI_MODEL to gemini-2.5-flash (not gemini-2.0-flash), confirm GEMINI_API_KEY in Google AI Studio, then try again.`,
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
      `AI ${options.featureLabel} could not use model “${getGeminiModel()}”. Set GEMINI_MODEL=gemini-2.5-flash in Netlify (no quotes). ${geminiMsg}`,
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
