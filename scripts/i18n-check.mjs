/**
 * Compares every locale catalog against the English source of truth.
 * Run with `npm run i18n:check`. Exits non-zero when a locale has missing keys,
 * orphan keys, or interpolation placeholders that do not match English.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LOCALES_DIR = new URL("../src/i18n/locales/", import.meta.url).pathname;
const SOURCE = "en";

function flatten(tree, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

function load(locale) {
  return flatten(JSON.parse(readFileSync(join(LOCALES_DIR, `${locale}.json`), "utf8")));
}

function placeholders(value) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

/**
 * A locale may declare CLDR plural forms that English does not need — Arabic
 * uses six categories where English only has `_one`/`_other`. Those extra keys
 * are legitimate (see `candidates()` in src/i18n/translate.ts), so resolve each
 * target key to the English base it varies, and only treat it as an orphan when
 * no such base exists or the category is not real for that locale.
 */
function pluralBase(locale, key, source) {
  const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
  const match = key.match(/^(.+)_([a-z]+)$/);
  if (!match || !categories.includes(match[2])) return null;
  const [, base] = match;
  for (const candidate of [`${base}_other`, `${base}_one`, base]) {
    if (candidate in source) return candidate;
  }
  return null;
}

const source = load(SOURCE);
const locales = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .filter((l) => l !== SOURCE);

let failed = false;

console.log(`en.json: ${Object.keys(source).length} keys\n`);

for (const locale of locales) {
  const target = load(locale);
  const missing = Object.keys(source).filter((k) => !(k in target));

  // Locale-only plural forms, mapped to the English key they vary.
  const pluralForms = new Map();
  for (const key of Object.keys(target)) {
    if (key in source) continue;
    const base = pluralBase(locale, key, source);
    if (base) pluralForms.set(key, base);
  }

  const orphans = Object.keys(target).filter((k) => !(k in source) && !pluralForms.has(k));
  const varMismatch = Object.keys(target)
    .filter((k) => k in source)
    .filter((k) => placeholders(source[k]).join() !== placeholders(target[k]).join());
  // A plural form may drop a placeholder (Arabic duals carry the number in the
  // noun itself) but must never introduce one English does not define.
  const varUnknown = [...pluralForms].filter(([key, base]) =>
    placeholders(target[key]).some((name) => !placeholders(source[base]).includes(name)),
  );
  const untranslated = Object.keys(target).filter(
    (k) => k in source && target[k] === source[k] && /[a-z]{4}/i.test(source[k]),
  );

  const problems = missing.length + orphans.length + varMismatch.length + varUnknown.length;
  if (problems > 0) failed = true;

  console.log(
    `${locale}.json: ${Object.keys(target).length} keys · ${missing.length} missing · ` +
      `${orphans.length} orphan · ${varMismatch.length + varUnknown.length} placeholder mismatch · ` +
      `${pluralForms.size} locale plural forms · ` +
      `${untranslated.length} identical to English`,
  );
  const show = (label, keys) => {
    if (keys.length === 0) return;
    console.log(`  ${label}:`);
    for (const k of keys.slice(0, 40)) console.log(`    ${k}`);
    if (keys.length > 40) console.log(`    …and ${keys.length - 40} more`);
  };
  show("missing", missing);
  show("orphan (not in en.json and not a plural form — likely a typo)", orphans);
  show("placeholder mismatch", varMismatch);
  show(
    "unknown placeholder in plural form",
    varUnknown.map(([key, base]) => `${key} (varies ${base})`),
  );
  console.log("");
}

if (failed) {
  console.error("i18n:check failed — fix the keys listed above.");
  process.exit(1);
}
console.log("All locale catalogs match en.json.");
