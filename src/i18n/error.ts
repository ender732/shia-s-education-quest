import type { TranslationVars } from "@/i18n/translate";

/**
 * Error carrying a message-catalog key instead of a baked-in English sentence.
 * Throw this from shared helpers (`src/lib/**`) so the UI that catches it can
 * render the message in the reader's language.
 */
export class I18nError extends Error {
  readonly key: string;
  readonly vars?: TranslationVars;

  constructor(key: string, vars?: TranslationVars) {
    super(key);
    this.name = "I18nError";
    this.key = key;
    this.vars = vars;
  }
}

export function isI18nError(error: unknown): error is I18nError {
  return error instanceof I18nError;
}

/** Sentinel for "the user cancelled a confirm dialog" — never shown to anyone. */
export const CANCELLED = "cancelled";

export function isCancelled(error: unknown): boolean {
  return error instanceof Error && error.message === CANCELLED;
}
