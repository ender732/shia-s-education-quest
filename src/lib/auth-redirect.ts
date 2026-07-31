/** Canonical post-email / OAuth landing path for Supabase Auth redirects. */
export const AUTH_CONFIRM_PATH = "/auth/confirm";
export const AUTH_CONFIRMED_PATH = "/auth/confirmed";

const ALLOWED_AUTH_REDIRECT_PATHS = new Set<string>([
  AUTH_CONFIRM_PATH,
  AUTH_CONFIRMED_PATH,
  "/dashboard",
  "/auth",
]);

/**
 * Allowlist same-origin relative paths only (blocks open redirects / protocol-relative URLs).
 */
export function sanitizeAppPath(path: string, fallback: string = AUTH_CONFIRM_PATH): string {
  if (!path || typeof path !== "string") return fallback;

  const trimmed = path.trim();
  // Reject absolute URLs, protocol-relative, backslashes, and control chars
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("@") ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return fallback;
  }

  const bare = trimmed.split("?")[0]?.split("#")[0] ?? fallback;
  if (!/^\/[A-Za-z0-9/_-]*$/.test(bare)) return fallback;
  if (!ALLOWED_AUTH_REDIRECT_PATHS.has(bare)) return fallback;
  return bare;
}

/** Absolute redirect URL using the current browser origin (localhost + Netlify). */
export function getAuthRedirectUrl(path: string = AUTH_CONFIRM_PATH): string {
  const safePath = sanitizeAppPath(path, AUTH_CONFIRM_PATH);
  if (typeof window === "undefined") return safePath;
  return `${window.location.origin}${safePath}`;
}
