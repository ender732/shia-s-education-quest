/** Canonical post-email / OAuth landing path for Supabase Auth redirects. */
export const AUTH_CONFIRM_PATH = "/auth/confirm";
export const AUTH_CONFIRMED_PATH = "/auth/confirmed";

/** Absolute redirect URL using the current browser origin (localhost + Netlify). */
export function getAuthRedirectUrl(path: string = AUTH_CONFIRM_PATH): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
