/**
 * Google Gemini (Generative Language API) helpers — server-only.
 * Env: GEMINI_API_KEY (preferred) or GOOGLE_GENERATIVE_AI_API_KEY.
 * Model: GEMINI_MODEL or AI_MODEL (default gemini-2.5-flash).
 * Avoid gemini-2.0-flash on free tier — Google often sets its quota to 0 (HTTP 429).
 */

const DEFAULT_MODEL = "gemini-2.5-flash";
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

export function getGeminiModel(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    process.env.AI_MODEL?.trim() ||
    DEFAULT_MODEL
  );
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
  }>;
  error?: { message?: string; status?: string; code?: number };
};

export async function generateGeminiText(options: GenerateOptions): Promise<string> {
  const apiKey = requireGeminiApiKey(options.featureLabel);
  const model = getGeminiModel();
  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

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

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    const detail = await response.text().catch(() => "");
    console.error(`Gemini API rate limit (${options.featureLabel})`, model, detail.slice(0, 500));
    const mentionsZeroQuota = /limit:\s*0/i.test(detail);
    const mentionsOldFlash = /gemini-2\.0-flash/i.test(detail) || /gemini-2\.0-flash/i.test(model);
    if (mentionsZeroQuota || mentionsOldFlash) {
      throw new Error(
        `AI ${options.featureLabel} hit a Gemini quota limit for model “${model}”. In Netlify, set GEMINI_MODEL to gemini-2.5-flash (not gemini-2.0-flash), confirm GEMINI_API_KEY in Google AI Studio, then try again.`,
      );
    }
    throw new Error(
      `The AI ${options.featureLabel} is rate-limited right now. Wait a minute, or check your Gemini quota in Google AI Studio.`,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `AI ${options.featureLabel} rejected the API key. Check GEMINI_API_KEY in your server environment.`,
    );
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Gemini API error (${options.featureLabel})`, response.status, detail);
    throw new Error(
      `The AI could not complete ${options.featureLabel}. Check GEMINI_API_KEY / GEMINI_MODEL (or AI_MODEL) and try again.`,
    );
  }

  const payload = (await response.json()) as GeminiGenerateResponse;
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error(`The AI returned an empty reply for ${options.featureLabel}. Please try again.`);
  }
  return text;
}

export async function generateGeminiJson(
  options: Omit<GenerateOptions, "json">,
): Promise<unknown> {
  const raw = await generateGeminiText({ ...options, json: true });
  return parseJsonFromModelText(raw);
}
