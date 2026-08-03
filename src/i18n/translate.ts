import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/i18n/config";
import { catalogFor, fallbackCatalog } from "@/i18n/messages";

export type TranslationVars = Record<string, string | number | undefined | null>;

const PLACEHOLDER = /\{(\w+)\}/g;

const pluralRules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALE_META[locale].bcp47);
    pluralRules.set(locale, rules);
  }
  return rules;
}

/**
 * Candidate keys for a lookup, most specific first. When `count` is supplied we
 * try the CLDR plural category for the active locale (`_one`, `_few`, `_many`…)
 * before `_other` and the bare key, so Arabic and Spanish can add the forms they
 * need without English having to declare them.
 */
function candidates(locale: Locale, key: string, count?: number): string[] {
  if (typeof count !== "number" || Number.isNaN(count)) return [key];
  const category = rulesFor(locale).select(count);
  return [`${key}_${category}`, `${key}_other`, key];
}

function interpolate(template: string, vars: TranslationVars | undefined): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Resolves `key` in `locale`, falling back to English and finally to the key
 * itself so a missing translation is visible but never crashes a screen.
 */
export function translate(locale: Locale, key: string, vars?: TranslationVars): string {
  const count = typeof vars?.count === "number" ? vars.count : undefined;
  const keys = candidates(locale, key, count);
  const primary = catalogFor(locale);
  const fallback = fallbackCatalog();

  for (const candidate of keys) {
    const hit = primary[candidate];
    if (typeof hit === "string" && hit !== "") return interpolate(hit, vars);
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallbackKeys = candidates(DEFAULT_LOCALE, key, count);
    for (const candidate of fallbackKeys) {
      const hit = fallback[candidate];
      if (typeof hit === "string" && hit !== "") return interpolate(hit, vars);
    }
  }

  if (import.meta.env.DEV) {
    console.warn(`[i18n] missing key "${key}" for locale "${locale}"`);
  }
  return key;
}

/** Like `translate`, but returns null when neither the locale nor English has the key. */
export function translateOptional(
  locale: Locale,
  key: string,
  vars?: TranslationVars,
): string | null {
  const count = typeof vars?.count === "number" ? vars.count : undefined;
  const primary = catalogFor(locale);
  for (const candidate of candidates(locale, key, count)) {
    const hit = primary[candidate];
    if (typeof hit === "string" && hit !== "") return interpolate(hit, vars);
  }
  if (locale === DEFAULT_LOCALE) return null;

  const fallback = fallbackCatalog();
  for (const candidate of candidates(DEFAULT_LOCALE, key, count)) {
    const hit = fallback[candidate];
    if (typeof hit === "string" && hit !== "") return interpolate(hit, vars);
  }
  return null;
}

/**
 * Turns free-form database content (a subject or task title) into a catalog key
 * segment: lowercase, non-alphanumerics collapsed to `_`.
 */
export function slugKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
