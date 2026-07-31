/** Persists signup path across Google OAuth redirect (sessionStorage). */

export const AUTH_INTENT_KEY = "shia_auth_intent";

export type AuthSignupIntent = {
  path: "student" | "parent";
  dateOfBirth?: string;
  confirmedParentGuardian?: boolean;
  parentContactEmail?: string;
  displayName?: string;
};

export function saveAuthIntent(intent: AuthSignupIntent): void {
  try {
    sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // ignore quota / private mode
  }
}

export function readAuthIntent(): AuthSignupIntent | null {
  try {
    const raw = sessionStorage.getItem(AUTH_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSignupIntent;
    if (parsed?.path !== "student" && parsed?.path !== "parent") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthIntent(): void {
  try {
    sessionStorage.removeItem(AUTH_INTENT_KEY);
  } catch {
    // ignore
  }
}
