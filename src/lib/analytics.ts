/** First-party site analytics — purpose-limited, no cross-site fingerprinting. */

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "share",
  "copy_link",
  "signup_start",
  "login",
  "confirm_email",
  "oauth_return",
  "lesson_open",
  "book_assign",
  "session_start",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

const VISITOR_KEY = "sq_vid";
const SESSION_KEY = "sq_sid";

const KNOWN_BOTS: { pattern: RegExp; name: string }[] = [
  { pattern: /googlebot/i, name: "Googlebot" },
  { pattern: /bingbot/i, name: "Bingbot" },
  { pattern: /duckduckbot/i, name: "DuckDuckBot" },
  { pattern: /yandexbot/i, name: "YandexBot" },
  { pattern: /baiduspider/i, name: "Baiduspider" },
  { pattern: /slurp/i, name: "Yahoo Slurp" },
  { pattern: /facebookexternalhit/i, name: "Facebook" },
  { pattern: /twitterbot/i, name: "Twitterbot" },
  { pattern: /linkedinbot/i, name: "LinkedInBot" },
  { pattern: /embedly/i, name: "Embedly" },
  { pattern: /quora link preview/i, name: "Quora" },
  { pattern: /showyoubot/i, name: "Showyoubot" },
  { pattern: /outbrain/i, name: "Outbrain" },
  { pattern: /pinterest/i, name: "Pinterest" },
  { pattern: /applebot/i, name: "Applebot" },
  { pattern: /semrushbot/i, name: "SemrushBot" },
  { pattern: /ahrefsbot/i, name: "AhrefsBot" },
  { pattern: /mj12bot/i, name: "MJ12bot" },
  { pattern: /dotbot/i, name: "DotBot" },
  { pattern: /petalbot/i, name: "PetalBot" },
  { pattern: /bytespider/i, name: "Bytespider" },
  { pattern: /gptbot/i, name: "GPTBot" },
  { pattern: /claudebot/i, name: "ClaudeBot" },
  { pattern: /anthropic/i, name: "Anthropic" },
  { pattern: /chatgpt-user/i, name: "ChatGPT-User" },
  { pattern: /ccbot/i, name: "CCBot" },
  { pattern: /amazonbot/i, name: "Amazonbot" },
  { pattern: /ia_archiver/i, name: "Alexa" },
  { pattern: /pingdom/i, name: "Pingdom" },
  { pattern: /uptimerobot/i, name: "UptimeRobot" },
  { pattern: /headlesschrome/i, name: "HeadlessChrome" },
  { pattern: /phantomjs/i, name: "PhantomJS" },
  { pattern: /selenium/i, name: "Selenium" },
  { pattern: /puppeteer/i, name: "Puppeteer" },
  { pattern: /crawl|spider|bot|slurp|fetcher|scanner/i, name: "generic-bot" },
];

export function classifyUserAgent(ua: string | null | undefined): {
  isBot: boolean;
  botName: string | null;
} {
  const value = (ua ?? "").trim();
  if (!value) return { isBot: false, botName: null };
  for (const bot of KNOWN_BOTS) {
    if (bot.pattern.test(value)) {
      return { isBot: true, botName: bot.name };
    }
  }
  return { isBot: false, botName: null };
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode / blocked storage — session still works in-memory
  }
}

let memoryVisitorId: string | null = null;
let memorySessionId: string | null = null;
let sessionStarted = false;
let lastPagePath: string | null = null;

export function getVisitorId(): string {
  if (typeof window === "undefined") return "ssr-placeholder";
  if (memoryVisitorId) return memoryVisitorId;
  const existing = readStorage(VISITOR_KEY);
  if (existing && existing.length >= 8) {
    memoryVisitorId = existing;
    return existing;
  }
  const id = uuid();
  memoryVisitorId = id;
  writeStorage(VISITOR_KEY, id);
  return id;
}

export function getAnalyticsSessionId(): string | null {
  if (memorySessionId) return memorySessionId;
  const existing = readStorage(SESSION_KEY);
  if (existing) {
    memorySessionId = existing;
    return existing;
  }
  return null;
}

function setAnalyticsSessionId(id: string) {
  memorySessionId = id;
  writeStorage(SESSION_KEY, id);
}

function parseUtm(search: string): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
} {
  const params = new URLSearchParams(search);
  return {
    utm_source: truncate(params.get("utm_source"), 100),
    utm_medium: truncate(params.get("utm_medium"), 100),
    utm_campaign: truncate(params.get("utm_campaign"), 100),
    utm_content: truncate(params.get("utm_content"), 100),
    utm_term: truncate(params.get("utm_term"), 100),
  };
}

function coarseScreen(): { width: number | null; height: number | null } {
  if (typeof window === "undefined") return { width: null, height: null };
  // Bucket to reduce uniqueness (privacy): round to nearest 100
  const w = Math.round((window.screen?.width ?? 0) / 100) * 100 || null;
  const h = Math.round((window.screen?.height ?? 0) / 100) * 100 || null;
  return { width: w, height: h };
}

function clientContext() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { isBot, botName } = classifyUserAgent(ua);
  const screen = coarseScreen();
  const utm =
    typeof window !== "undefined"
      ? parseUtm(window.location.search)
      : {
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
          utm_content: null,
          utm_term: null,
        };

  return {
    user_agent: truncate(ua, 512),
    is_bot: isBot,
    bot_name: botName,
    language: truncate(
      typeof navigator !== "undefined" ? navigator.language : null,
      32,
    ),
    timezone_offset:
      typeof Date !== "undefined" ? new Date().getTimezoneOffset() : null,
    screen_width: screen.width,
    screen_height: screen.height,
    referrer:
      typeof document !== "undefined" ? truncate(document.referrer || null, 500) : null,
    ...utm,
  };
}

type TrackPayload = {
  eventName: AnalyticsEventName;
  path?: string | null;
  properties?: Record<string, string | number | boolean | null>;
  landingPath?: string | null;
};

async function sendTrack(payload: TrackPayload): Promise<void> {
  if (typeof window === "undefined") return;

  const visitorId = getVisitorId();
  const ctx = clientContext();
  const path =
    truncate(payload.path ?? `${window.location.pathname}${window.location.search}`, 500) ??
    "/";
  const sessionId = getAnalyticsSessionId();

  const body = {
    visitorId,
    sessionId,
    eventName: payload.eventName,
    path,
    landingPath: truncate(payload.landingPath ?? path, 500),
    properties: payload.properties ?? {},
    ...ctx,
  };

  // Prefer server beacon (can attach hashed IP). Fall back to direct RPC.
  try {
    const { trackAnalyticsBeacon } = await import("@/lib/analytics.functions");
    const result = await trackAnalyticsBeacon({ data: body });
    if (result?.sessionId) setAnalyticsSessionId(result.sessionId);
    return;
  } catch {
    // server env may be missing — use client RPC
  }

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("track_analytics", {
      _visitor_id: body.visitorId,
      _event_name: body.eventName,
      _session_id: body.sessionId,
      _path: body.path,
      _referrer: body.referrer,
      _utm_source: body.utm_source,
      _utm_medium: body.utm_medium,
      _utm_campaign: body.utm_campaign,
      _utm_content: body.utm_content,
      _utm_term: body.utm_term,
      _user_agent: body.user_agent,
      _is_bot: body.is_bot,
      _bot_name: body.bot_name,
      _language: body.language,
      _timezone_offset: body.timezone_offset,
      _screen_width: body.screen_width,
      _screen_height: body.screen_height,
      _ip_hash: null,
      _properties: body.properties,
      _landing_path: body.landingPath,
    });
    if (!error && typeof data === "string") setAnalyticsSessionId(data);
  } catch {
    // analytics must never break the app
  }
}

export async function trackEvent(
  eventName: AnalyticsEventName,
  properties?: Record<string, string | number | boolean | null>,
  path?: string | null,
): Promise<void> {
  if (!sessionStarted) {
    sessionStarted = true;
    await sendTrack({
      eventName: "session_start",
      path,
      landingPath: typeof window !== "undefined" ? window.location.pathname : path,
      properties: undefined,
    });
  }
  await sendTrack({ eventName, properties, path });
}

export async function trackPageView(path?: string | null): Promise<void> {
  const resolved =
    path ??
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : null);
  if (resolved && resolved === lastPagePath) return;
  lastPagePath = resolved;
  await trackEvent("page_view", undefined, resolved);
}
