# Internationalization

A small custom i18n layer — no runtime dependency. It covers what this app needs
(three locales, nested keys, interpolation, CLDR plurals, RTL) in ~250 lines and
works with TanStack Start's SSR without an async provider.

Supported locales: **English (`en`, default and source of truth)**, **Spanish
(`es`)**, **Arabic (`ar`, RTL)**.

## Files

| Path                                  | Purpose                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/i18n/config.ts`                  | Locale registry: codes, default, autonym, BCP-47 tag, text direction, `localStorage` key.  |
| `src/i18n/locales/en.json`            | **English source catalog — the key source of truth.**                                      |
| `src/i18n/locales/es.json`            | Spanish catalog. Owned by the Spanish agent.                                               |
| `src/i18n/locales/ar.json`            | Arabic catalog. Owned by the Arabic agent.                                                 |
| `src/i18n/messages.ts`                | Loads the JSON catalogs via `import.meta.glob` and flattens them to dot-notation.          |
| `src/i18n/translate.ts`               | Lookup, plural candidates, `{var}` interpolation, English fallback, `slugKey`.             |
| `src/i18n/index.tsx`                  | `I18nProvider`, `useTranslation()`, `localeOptions()`. Sets `lang`/`dir` on `<html>`.      |
| `src/i18n/error.ts`                   | `I18nError` for throwing a catalog key from non-React code, plus the `CANCELLED` sentinel. |
| `src/components/LanguageSwitcher.tsx` | EN / ES / AR select. Rendered on `/auth` and on the dashboard header.                      |
| `scripts/i18n-check.mjs`              | `npm run i18n:check` — diffs every locale against `en.json`.                               |

## Convention

**Nested JSON, one file per locale, keyed by feature.** Components address keys
with dot notation:

```tsx
const { t } = useTranslation();
t("parent.progress.linkTitle");
t("taskboard.xpReward", { xp: 25 });
```

Rules:

- Top-level namespaces mirror features: `app`, `common`, `language`, `footer`,
  `errors`, `landing`, `auth`, `dashboard`, `gamification`, `leaderboard`,
  `linkCode`, `subjects`, `tasks`, `taskboard`, `lesson`, `scribble`, `pdf`,
  `book`, `parent`, `arcade`, `howto`, `admin`, `privacy`, `serverErrors`.
- Keys are `camelCase`; leaf values are strings. Nesting depth is free.
- Shared UI words live in `common.*` (`common.copy`, `common.publish`,
  `common.attempts`). Reuse those before adding a feature-local duplicate.
- Never inline a string in a component without a matching `en.json` entry.
- A missing key falls back to English, then renders the key itself and logs a
  dev-only warning. It never throws.

### Interpolation

`{name}` placeholders, filled from the `vars` argument:

```json
"gamification.welcomeBack": "Welcome back, {name}!"
```

```tsx
t("gamification.welcomeBack", { name: profile.display_name });
```

**Translators must keep every placeholder, spelled identically.** `npm run
i18n:check` fails on a mismatch. Reordering placeholders within the sentence is
fine and often necessary.

### Plurals

Pass a `count` var and suffix the key with a CLDR plural category. Lookup order
is `key_<category>` → `key_other` → `key`:

```json
"common.attempts_one": "{count} attempt",
"common.attempts_other": "{count} attempts"
```

English only needs `_one` and `_other`. **Spanish and Arabic may add any
categories their language requires** — `_zero`, `_two`, `_few`, `_many` — even
though English does not declare them. The category is selected with
`Intl.PluralRules` for the _active_ locale, so extra forms are picked up
automatically. Arabic in particular should add `_zero`, `_two`, `_few`, and
`_many` wherever a count is rendered.

### Numbers and dates

Do not format these by hand. `useTranslation()` returns locale-aware helpers:

```tsx
const { formatNumber, formatDateTime } = useTranslation();
formatNumber(1250); // "1,250" / "1.250" / "١٢٥٠"
formatDateTime(row.created_at); // Intl.DateTimeFormat with the locale's BCP-47 tag
```

## How a user switches language

`LanguageSwitcher` (top-right of `/auth` and of the dashboard header) writes the
choice to `localStorage` under `shia-quest:locale`. It is a single global
preference, not per-profile, so it survives sign-out and applies before a session
exists.

On first load with no stored value, the provider checks `navigator.languages` and
adopts `es` or `ar` if the browser asks for one. The change applies instantly —
no reload, no route change — and propagates to other open tabs through the
`storage` event.

SSR always renders `<html lang="en" dir="ltr">`; `I18nProvider` rewrites both
attributes on mount, which is why there is no hydration mismatch when the stored
locale is Arabic. Everything else — Tailwind logical properties (`ps-`, `pe-`,
`ms-`, `me-`), flex order, icon placement — follows `dir` automatically.

## Adding or changing English copy

1. Add the key to `src/i18n/locales/en.json` under the right feature namespace.
2. Use `t("your.key")` in the component.
3. Run `npm run i18n:check` — the new key shows as missing for `es`/`ar`, which
   is the signal for those agents to fill it in.

**Renaming is additive.** Add the new key, migrate call sites, and leave the old
key in place for one pass so sibling catalogs do not break mid-flight.

## Adding a translation (Spanish / Arabic agents)

Edit **only** `src/i18n/locales/es.json` or `src/i18n/locales/ar.json`. Do not
touch `en.json`, components, or `src/lib`.

1. `npm run i18n:check` to list what your locale is missing.
2. Mirror `en.json`'s structure exactly — same nesting, same key spelling. A key
   that does not exist in `en.json` is reported as an _orphan_ and is dead
   weight; it means a typo.
3. Keep every `{placeholder}`. Add plural categories your language needs.
4. Re-run `npm run i18n:check` until your locale reports 0 missing, 0 orphan,
   0 placeholder mismatch.

The report also counts entries **identical to English**. Some of those are
legitimate (`XP`, `RACECE`, `Netlify`, proper nouns); the rest are untranslated.

### Namespaces that need care

- **`serverErrors.*`** — Server functions in `src/lib/*.functions.ts` throw plain
  English sentences across the network. `tError()` slugifies the message and
  looks it up here (`"Lesson not found."` → `serverErrors.lesson_not_found`), so
  translating this namespace localizes those errors with no code change. The key
  is derived from the English text: **do not rename these keys.**
- **`subjects.title` / `subjects.description` / `tasks.title` /
  `tasks.description`** — Same trick for database-seeded curriculum content, via
  `tDb()`. Keys are slugs of the seeded English value. Content a parent typed
  themselves has no key and stays as entered — correct behavior, not a gap.
- **`arcade.mode.*`, `arcade.levels.*`, `arcade.subject.*`** — Keys are the
  runtime mode/level/subject IDs (`number-dash`, `L1`, `math`). IDs stay in
  English; only `title`, `blurb`, `accentLabel`, `description` are translated.
- **`howto.shorts.<id>.scenes.<n>`** — Scene numbers are 1-based and must match
  the scene count in `src/lib/howto-shorts.ts`. Do not add or drop scenes.
- **`gamification.levelTitles`** — `1`–`12` are named tiers; `beyond` takes a
  `{level}` var for levels past the named list.

## Translating from non-React code

`head()` functions, server functions, and `src/lib` utilities have no React
context. Two options:

- **Throw a key.** `throw new I18nError("book.removeNotAllowed")` from a mutation
  or utility, then render it at the call site with
  `tError(err, "book.removeFailed")`. Client-side code should prefer this.
- **Return a key.** `levelTitleKey(level)` and `durationParts(seconds)` in
  `src/lib` hand the UI a key or key fragment instead of a finished sentence.

## Known gaps

Deliberate scope decisions, not oversights:

- **Document `<title>`/meta tags stay English.** TanStack Start's `head()` runs
  outside React, so there is no locale to read. Would need a router-context
  plumbing change.
- **Arcade question banks** (`src/lib/arcade/catalogs/*.ts`, ~150 questions with
  prompts, choices, and tips) and **curriculum lesson content**
  (`src/lib/curriculum.ts`, ~1900 lines of teaching notes and quiz items) are
  untranslated. All arcade and lesson _chrome_ is. Translating the academic
  content is a separate, larger project that needs subject-matter review, not
  string extraction — a mistranslated math question teaches the wrong thing.
- **AI-generated content** (coach replies, book-report feedback, worksheet
  drafts) comes back from Gemini in English. Localizing it means adding a locale
  to the prompts in `src/lib/gemini.server.ts` and `src/lib/lesson-draft.server.ts`.
- **`src/components/ui/*`** is unused shadcn/ui scaffolding — nothing in the app
  imports it, so its English strings never reach a user.
- **All three catalogs ship in the client bundle** (~55 kB gzipped total) because
  `import.meta.glob` is eager, which keeps `translate()` synchronous during
  render. Worth revisiting only if a fourth locale lands.
