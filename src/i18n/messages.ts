import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";

export type MessageTree = { [key: string]: string | MessageTree };

/** Flat map of "a.b.c" -> "text" for one locale. */
export type FlatMessages = Record<string, string>;

function flatten(tree: MessageTree, prefix = "", out: FlatMessages = {}): FlatMessages {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else flatten(value, path, out);
  }
  return out;
}

// Eager glob so a locale file that a translator has not created yet simply
// resolves to nothing (and falls back to English) instead of breaking the build.
const modules = import.meta.glob<{ default: MessageTree }>("./locales/*.json", {
  eager: true,
});

const catalogs: Partial<Record<Locale, FlatMessages>> = {};

for (const [path, mod] of Object.entries(modules)) {
  const code = path
    .split("/")
    .pop()
    ?.replace(/\.json$/, "");
  if (!isLocale(code)) continue;
  const tree = (mod as { default?: MessageTree }).default;
  if (!tree) continue;
  catalogs[code] = flatten(tree);
}

export function catalogFor(locale: Locale): FlatMessages {
  return catalogs[locale] ?? {};
}

export function fallbackCatalog(): FlatMessages {
  return catalogs[DEFAULT_LOCALE] ?? {};
}

/** Keys present in English but missing (or blank) in `locale`. Used by `npm run i18n:check`. */
export function missingKeys(locale: Locale): string[] {
  const source = fallbackCatalog();
  const target = catalogFor(locale);
  return Object.keys(source).filter((key) => {
    const value = target[key];
    return typeof value !== "string" || value.trim() === "";
  });
}

/** Keys present in `locale` but not in the English source (typos, stale keys). */
export function orphanKeys(locale: Locale): string[] {
  const source = fallbackCatalog();
  return Object.keys(catalogFor(locale)).filter((key) => !(key in source));
}
