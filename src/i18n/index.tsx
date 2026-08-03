import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Locale,
} from "@/i18n/config";
import { isI18nError } from "@/i18n/error";
import { slugKey, translate, translateOptional, type TranslationVars } from "@/i18n/translate";

export type { Locale } from "@/i18n/config";
export { LOCALES, LOCALE_META, DEFAULT_LOCALE } from "@/i18n/config";
export { I18nError, isCancelled, CANCELLED } from "@/i18n/error";
export type { TranslationVars } from "@/i18n/translate";

export type TranslateFn = (key: string, vars?: TranslationVars) => string;

export type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  bcp47: string;
  t: TranslateFn;
  /**
   * Message for a caught error. `I18nError` carries its own key. Plain errors
   * from server functions arrive as English sentences, so those are looked up
   * under `serverErrors.*` before falling back to the raw text, then the key.
   */
  tError: (error: unknown, fallbackKey: string) => string;
  /**
   * Translates database-seeded copy (subject/task titles, descriptions) by
   * slugging the English value into `${namespace}.${slug}`. Falls back to the
   * stored English text when a parent typed their own title.
   */
  tDb: (namespace: string, value: string | null | undefined) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function detectBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag?.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start on the default so SSR markup and the first client render match;
  // the stored/browser preference is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const initial = readStoredLocale() ?? detectBrowserLocale();
    if (initial && initial !== DEFAULT_LOCALE) setLocaleState(initial);
  }, []);

  // Keep every open tab on the same language.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCALE_STORAGE_KEY) return;
      if (isLocale(event.newValue)) setLocaleState(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const meta = LOCALE_META[locale];

  // The root shell renders <html lang="en" dir="ltr">; Arabic needs both flipped.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", meta.bcp47);
    root.setAttribute("dir", meta.dir);
  }, [meta.bcp47, meta.dir]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* private mode / quota — language still applies for this session */
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t: TranslateFn = (key, vars) => translate(locale, key, vars);
    return {
      locale,
      setLocale,
      dir: meta.dir,
      isRtl: meta.dir === "rtl",
      bcp47: meta.bcp47,
      t,
      tError: (error, fallbackKey) => {
        if (isI18nError(error)) return t(error.key, error.vars);
        if (error instanceof Error && error.message) {
          const slug = slugKey(error.message);
          return (slug ? translateOptional(locale, `serverErrors.${slug}`) : null) ?? error.message;
        }
        return t(fallbackKey);
      },
      tDb: (namespace, value) => {
        if (!value) return "";
        const slug = slugKey(value);
        if (!slug) return value;
        return translateOptional(locale, `${namespace}.${slug}`) ?? value;
      },
      formatNumber: (num, options) => new Intl.NumberFormat(meta.bcp47, options).format(num),
      formatDateTime: (input, options) =>
        new Intl.DateTimeFormat(
          meta.bcp47,
          options ?? { dateStyle: "medium", timeStyle: "short" },
        ).format(new Date(input)),
    };
  }, [locale, setLocale, meta.bcp47, meta.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used inside <I18nProvider>.");
  }
  return ctx;
}

/** Every locale offered in the switcher, in registry order. */
export function localeOptions() {
  return LOCALES.map((code) => ({ code, ...LOCALE_META[code] }));
}
