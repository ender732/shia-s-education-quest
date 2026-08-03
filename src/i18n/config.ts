/**
 * Locale registry. Adding a locale here + a matching `locales/<code>.json`
 * is all that is required to make it appear in the language switcher.
 */

export const LOCALES = ["en", "es", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export type LocaleMeta = {
  /** Name of the language written in that language. */
  autonym: string;
  /** Name used in English-language contexts (docs, aria labels). */
  englishName: string;
  dir: "ltr" | "rtl";
  /** BCP-47 tag handed to Intl and to the <html lang> attribute. */
  bcp47: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { autonym: "English", englishName: "English", dir: "ltr", bcp47: "en" },
  es: { autonym: "Español", englishName: "Spanish", dir: "ltr", bcp47: "es" },
  ar: { autonym: "العربية", englishName: "Arabic", dir: "rtl", bcp47: "ar" },
};

export const LOCALE_STORAGE_KEY = "shia-quest:locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}
