/** Persists signup path across Google OAuth redirect (localStorage — survives OAuth hops). */

export const AUTH_INTENT_KEY = "shia_auth_intent";

const INTENT_TTL_MS = 60 * 60 * 1000; // 1 hour

export type AuthSignupIntent = {
  path: "student" | "parent";
  dateOfBirth?: string;
  confirmedParentGuardian?: boolean;
  parentContactEmail?: string;
  displayName?: string;
  /** Epoch ms when intent was saved; used to expire stale intents. */
  savedAt?: number;
};

function readStore(kind: "local" | "session"): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function parseIntent(raw: string | null): AuthSignupIntent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSignupIntent;
    if (parsed?.path !== "student" && parsed?.path !== "parent") return null;
    if (parsed.savedAt && Date.now() - parsed.savedAt > INTENT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthIntent(intent: AuthSignupIntent): void {
  const payload = JSON.stringify({ ...intent, savedAt: Date.now() } satisfies AuthSignupIntent);
  const local = readStore("local");
  if (local) {
    try {
      local.setItem(AUTH_INTENT_KEY, payload);
    } catch {
      // ignore quota / private mode
    }
  }
  // Clear legacy sessionStorage copy so we don't read a stale older intent.
  const session = readStore("session");
  if (session) {
    try {
      session.removeItem(AUTH_INTENT_KEY);
    } catch {
      // ignore
    }
  }
}

export function readAuthIntent(): AuthSignupIntent | null {
  const local = readStore("local");
  const fromLocal = parseIntent(local?.getItem(AUTH_INTENT_KEY) ?? null);
  if (fromLocal) return fromLocal;

  // Migrate legacy sessionStorage intents written before localStorage switch.
  const session = readStore("session");
  const fromSession = parseIntent(session?.getItem(AUTH_INTENT_KEY) ?? null);
  if (fromSession) {
    saveAuthIntent(fromSession);
    return fromSession;
  }
  return null;
}

export function clearAuthIntent(): void {
  for (const kind of ["local", "session"] as const) {
    const store = readStore(kind);
    if (!store) continue;
    try {
      store.removeItem(AUTH_INTENT_KEY);
    } catch {
      // ignore
    }
  }
}
