/**
 * Server-side env resolution for Supabase.
 * Accepts either bare SUPABASE_* names or the Vite-prefixed names commonly
 * set in Netlify / local `.env` (VITE_SUPABASE_*).
 */

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function getSupabaseUrl(): string | undefined {
  return firstDefined(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL);
}

export function getSupabasePublishableKey(): string | undefined {
  return firstDefined(
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return firstDefined(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** URL + publishable key, or null when either is missing. */
export function getSupabasePublishableEnv(): { url: string; key: string } | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;
  return { url, key };
}

/** Throws a clear error listing which names to set (either convention). */
export function requireSupabasePublishableEnv(): { url: string; key: string } {
  const env = getSupabasePublishableEnv();
  if (env) return env;

  const missing = [
    ...(!getSupabaseUrl() ? ["SUPABASE_URL or VITE_SUPABASE_URL"] : []),
    ...(!getSupabasePublishableKey()
      ? ["SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY"]
      : []),
  ];
  const message = `Missing Supabase environment variable(s): ${missing.join(", ")}.`;
  console.error(`[Supabase] ${message}`);
  throw new Error(message);
}

export function requireSupabaseAdminEnv(): { url: string; serviceRoleKey: string } {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL or VITE_SUPABASE_URL"] : []),
      ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }
  return { url, serviceRoleKey };
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
