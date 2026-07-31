import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics";

const BeaconInput = z.object({
  visitorId: z.string().min(8).max(64),
  sessionId: z.string().uuid().nullable().optional(),
  eventName: z.enum(ANALYTICS_EVENT_NAMES),
  path: z.string().max(500).nullable().optional(),
  landingPath: z.string().max(500).nullable().optional(),
  referrer: z.string().max(500).nullable().optional(),
  utm_source: z.string().max(100).nullable().optional(),
  utm_medium: z.string().max(100).nullable().optional(),
  utm_campaign: z.string().max(100).nullable().optional(),
  utm_content: z.string().max(100).nullable().optional(),
  utm_term: z.string().max(100).nullable().optional(),
  user_agent: z.string().max(512).nullable().optional(),
  is_bot: z.boolean().optional(),
  bot_name: z.string().max(100).nullable().optional(),
  language: z.string().max(32).nullable().optional(),
  timezone_offset: z.number().int().nullable().optional(),
  screen_width: z.number().int().nullable().optional(),
  screen_height: z.number().int().nullable().optional(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

function supabaseUrlAndKey(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function clientIp(request: Request | undefined): string | null {
  if (!request?.headers) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-nf-client-connection-ip") ||
    null
  );
}

/** Truncated SHA-256 of IP — not reversible to full address; no raw IP stored. */
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`sq-analytics|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Server beacon for analytics. Attaches hashed IP when request headers are available.
 * Uses publishable key + SECURITY DEFINER RPC (no service role required).
 */
export const trackAnalyticsBeacon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BeaconInput.parse(input))
  .handler(async ({ data }) => {
    const creds = supabaseUrlAndKey();
    if (!creds) {
      throw new Error("Supabase env not configured for analytics beacon");
    }

    let ipHash: string | null = null;
    try {
      const request = getRequest();
      const ip = clientIp(request);
      if (ip) ipHash = await hashIp(ip);
    } catch {
      // IP optional
    }

    const supabase = createClient<Database>(creds.url, creds.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const props = (data.properties ?? {}) as Json;

    const { data: sessionId, error } = await supabase.rpc("track_analytics", {
      _visitor_id: data.visitorId,
      _event_name: data.eventName,
      _session_id: data.sessionId ?? null,
      _path: data.path ?? null,
      _referrer: data.referrer ?? null,
      _utm_source: data.utm_source ?? null,
      _utm_medium: data.utm_medium ?? null,
      _utm_campaign: data.utm_campaign ?? null,
      _utm_content: data.utm_content ?? null,
      _utm_term: data.utm_term ?? null,
      _user_agent: data.user_agent ?? null,
      _is_bot: data.is_bot ?? false,
      _bot_name: data.bot_name ?? null,
      _language: data.language ?? null,
      _timezone_offset: data.timezone_offset ?? null,
      _screen_width: data.screen_width ?? null,
      _screen_height: data.screen_height ?? null,
      _ip_hash: ipHash,
      _properties: props,
      _landing_path: data.landingPath ?? null,
    });

    if (error) throw new Error(error.message);
    return { sessionId: sessionId as string };
  });
