# English (`en`) i18n Audit

**Date:** 2026-08-03
**Scope:** English source of truth (`src/i18n/locales/en.json`) and every `t()` call site in
`src/**/*.tsx` / `src/**/*.ts`. Spanish and Arabic catalogs were read but **not modified** —
they belong to the `es` and `ar` auditors.
**Auditor:** independent audit pass (English only)

## Verdict: **PASS WITH GAPS**

English is a coherent source of truth. Every UI chrome string a user meets out of the box —
landing, auth, email confirmation, dashboard, task board, lesson player, worksheet, scribble
pad, PDF reader, book studio, arcade hub and game overlays, how-to shorts, parent portal, admin
analytics, footer, privacy, 404, and error boundary — resolves through `t()`. All 545 static
`t()` keys resolve in `en.json`; there are no missing keys and no dead-key renders.

Five accidental leftovers were found and fixed (below). The remaining gaps are the deliberate,
documented scope decisions: academic content (arcade question banks, curriculum), AI-generated
text, document `<title>`/meta, transactional email, and the pre-hydration SSR error page.

**Confidence toward "100% UI chrome translatable": 94%.**

The 6% reserve is because coverage was established by whole-tree static analysis (TypeScript AST
walks over JSX text, user-facing attributes, toast/throw arguments, and template literals) plus
targeted reading of every screen's source — not by driving each screen in a browser with `ar`
active. Static analysis cannot see a string that only appears under a runtime branch I did not
reason about, and it cannot judge whether a translated string overflows its container.

---

## New keys added by this audit (for the `es` / `ar` auditors)

Five keys. `es.json` is now 5 keys behind English; `ar.json` was already updated by the parallel
Arabic pass at the time of writing, so re-run `npm run i18n:check` before assuming otherwise.

| Key                                 | English value                    | Notes                                                 |
| ----------------------------------- | -------------------------------- | ----------------------------------------------------- |
| `common.percent`                    | `{value}%`                       | Wrapper so the `%` sign and digits follow the locale.  |
| `lesson.worksheet.partRequired`     | `Please complete: {prompt} — {part}` | Mirrors the existing `answerRequired` message.     |
| `parent.taskCreator.unitTagPlaceholder` | `187_MATH_FRACTIONS`         | An example unit-tag ID. Keep as-is unless a locale wants a different sample. |
| `admin.analytics.eventBotTag`       | ` · bot:{name}`                  | Leading space and separator are intentional; keep `{name}`. |
| `admin.analytics.eventBotUnnamed`   | `yes`                            | Shown when a bot session has no crawler name.         |

`common.percent` is deliberately a formatting wrapper, not a sentence: Arabic should keep the
`%` on the side its typography expects, and the `{value}` already arrives locale-formatted.

---

## 1. Source-of-truth check

`npm run i18n:check` at the end of the audit:

```
en.json: 862 keys

ar.json: 892 keys · 0 missing · 0 orphan · 0 placeholder mismatch · 30 locale plural forms · 15 identical to English

es.json: 857 keys · 5 missing · 0 orphan · 0 placeholder mismatch · 0 locale plural forms · 17 identical to English
  missing:
    common.percent
    lesson.worksheet.partRequired
    parent.taskCreator.unitTagPlaceholder
    admin.analytics.eventBotTag
    admin.analytics.eventBotUnnamed
```

The script exits non-zero, and that is the intended state: `src/i18n/README.md` says a new
English key showing up as missing for `es`/`ar` *is* the handoff signal. Nothing else is wrong —
0 orphans, 0 placeholder mismatches across both locales. Replaying the checker's comparison
logic with the five keys hypothetically present in both catalogs yields 0 missing, 0 orphan, and
0 placeholder mismatches for `es` and `ar` alike, so there is no structural problem hiding behind
the failure — only the five pending translations.

`en.json` itself is structurally sound: valid JSON, all leaves are strings, keys are `camelCase`,
namespaces mirror features, and no key is defined twice.

## 2. Coverage stats

| Metric                                              | Count |
| --------------------------------------------------- | ----- |
| Keys in `en.json`                                   | 862   |
| Static `t("literal")` call sites                    | 545   |
| …that fail to resolve in `en.json`                  | **0** |
| Dynamic `t(\`ns.${id}\`)` patterns                  | 29    |
| …with no matching English keys under their prefix   | **0** |
| `tError()` call sites (server-error localization)   | 21    |
| `tDb()` call sites (DB-seeded curriculum copy)      | 11    |
| `I18nError()` throws (localized key across a layer) | 19    |
| `formatNumber()` / `formatDateTime()` call sites    | 101 / 2 |
| App `.tsx` files (excluding unused `ui/*`)          | 38    |
| …that call `useTranslation()`                       | 28    |
| …that legitimately contain no copy                  | 10    |

The ten files without `useTranslation()` are all string-free: `AnalyticsPageTracker`,
`HowToContextual` (renders a hook's element), `useHowToShort`, `use-mobile`, `router.tsx`, the
`_authenticated` and `auth` layout routes, and the two deprecated `math-arcade/*` re-export
shims.

Keys by namespace: `arcade` 147, `parent` 134, `howto` 119, `lesson` 93, `auth` 54, `book` 36,
`gamification` 34, `admin` 30, `tasks` 26, `serverErrors` 26, `common` 24, `dashboard` 21,
`taskboard` 18, `privacy` 15, `leaderboard` 14, `linkCode` 12, `pdf` 12, `landing` 11,
`subjects` 11, `scribble` 8, `footer` 7, `errors` 5, `app` 3, `language` 2.

### Method

Four passes, all AST-based (TypeScript 5.9 compiler API) rather than grep-based, so JSX text,
attributes, template literals, and call arguments were classified by syntactic position instead
of by regex luck:

1. **Hardcoded-copy hunt** — every `JsxText` node, every string-valued JSX attribute outside a
   known non-copy allow-list (`className`, `href`, `id`, `viewBox`, …), every string literal
   rendered inside a `JsxExpression` (including both arms of ternaries and `&&` chains), every
   `toast.*` / `alert` / `confirm` argument, and every `new Error("…")`.
2. **Broad literal sweep** — every multi-word string literal and template literal in all of
   `src`, with Tailwind class strings, CSS functions, and URLs filtered out. This is what
   surfaced the library-level strings discussed in §4 and §5.
3. **Key resolution** — every `t()` / `translate()` / `translateOptional()` argument extracted
   and checked against a flattened `en.json`, including plural-suffix fallback, plus a reverse
   check for English keys nothing reaches.
4. **Number/date formatting** — every JSX expression rendering a numeric-looking identifier or
   member access that is not wrapped in `formatNumber` / `formatDateTime` / `t()`.

Verification after the fixes: `npx tsc --noEmit` reports the same 33 pre-existing errors as
before (all `null` vs `undefined` in `src/lib/analytics*.ts` and `src/lib/daily-activity.ts`,
unrelated to i18n) and no new ones. `npx eslint` on the four edited files reports only the
`prettier/prettier` complaints that already exist at `HEAD` for those files — verified by
formatting the `HEAD` blobs at the repo's `printWidth: 100` and diffing.

## 3. Accidental leftovers found — and fixed

All five were fixed in English only: key added to `en.json`, call site wired to `t()`.

| # | Site | Was | Now |
| - | ---- | --- | --- |
| 1 | `src/components/ParentPortal.tsx:553` | `placeholder="187_MATH_FRACTIONS"` | `placeholder={t("parent.taskCreator.unitTagPlaceholder")}` |
| 2 | `src/routes/_authenticated/admin/analytics.tsx:375` | `` {ev.is_bot ? ` · bot:${ev.bot_name ?? "yes"}` : ""} `` | `t("admin.analytics.eventBotTag", { name: … })` with `eventBotUnnamed` for the fallback |
| 3 | `src/components/LessonPractice.tsx:759` | `` {`${effectiveQuizScore}%`} `` (the big result score) | `t("common.percent", { value: formatNumber(…) })` |
| 4 | `src/components/DailyLeaderboard.tsx:115` | `{row.best_score}%` | `t("common.percent", { value: formatNumber(row.best_score) })` |
| 5 | `src/components/LessonPractice.tsx:235` | multipart worksheet parts were validated only on the server, which throws an interpolated English sentence | client now throws `I18nError("lesson.worksheet.partRequired", { prompt, part })` before the request |

Notes on the two less obvious ones:

**#1** was the only non-`t()` `placeholder` in the codebase, and both of its sibling fields on
the same form already used `t()` — an oversight rather than a decision. The English value is
still the example unit-tag ID, so nothing changes visually.

**#5** is the one real reachable-bug fix. `gradeWorksheet` in
`src/lib/grading.functions.ts:149` rejects a multipart answer when *any* part is blank, but the
client's `fieldAnswerHasContent(answer, true)` passes when *at least one* part is filled. Fill
Part A, leave Part B empty, submit — and the server's
``throw new Error(`Please complete: ${field.prompt} — ${part.prompt}`)`` crosses the wire. Because
`tError()` localizes by slugifying the *whole* message, an interpolated message can never match a
`serverErrors.*` key, so that toast was permanently English for every locale. The client now
catches the same condition first and throws a keyed `I18nError`. The server throw stays as
defense in depth.

Also corrected while in `analytics.tsx`: three raw counts (`row.views`, `row.sessions`,
`b.sessions`) now go through `formatNumber`, and `ev.path ?? "—"` uses `t("common.none")`, which
is the same em dash. The README's rule is "do not format these by hand"; these were the only
three renders of a count that skipped it.

## 4. Explicitly out of scope — deliberate, not oversights

These match `src/i18n/README.md`'s "Known gaps" section, which I confirmed is accurate. Roughly
4,200 lines of English live behind this boundary.

- **Arcade question banks** — `src/lib/arcade/catalogs/{ela,math,reading,science,social}.ts`
  (~990 lines): question prompts, answer choices, and tips. All arcade *chrome* is translated
  (147 `arcade.*` keys). A mistranslated question teaches the wrong thing, so this needs
  subject-matter review, not string extraction.
- **Curriculum lesson content** — `src/lib/curriculum.ts` (~1,880 lines) of teaching notes and
  quiz items, plus `src/lib/lesson-video-library.ts` (~478 lines) of YouTube titles, channel
  names, and transcript blurbs. Video titles and channels are proper nouns and should stay
  English regardless.
- **AI-generated text** — coach replies, book-report feedback (`improvements`, `teacher_note`),
  and worksheet drafts arrive from Gemini in English. Localizing means adding a locale to the
  prompts in `src/lib/gemini.server.ts` / `src/lib/lesson-draft.server.ts`.
- **Document `<title>` and meta tags** — TanStack Start's `head()` runs outside React, so there
  is no locale to read. Affects `__root`, `index`, `auth/index`, `auth/confirm`,
  `auth/confirmed`, `dashboard`, `admin/analytics`, `privacy`.
- **`src/components/ui/*`** — unused shadcn/ui scaffolding. Nothing in the app imports it
  (verified: zero `@/components/ui/` imports outside the folder), so its English never renders.
- **Transactional email** — `src/lib/send-email.server.ts` builds the parent-link-code and
  welcome emails in English. Server-side, no locale available; the recipient's language is not
  known at send time.
- **SSR failure page** — `src/lib/error-page.ts` returns a static English HTML document served
  when SSR itself throws, before React or `I18nProvider` exist. `src/routes/__root.tsx`'s
  in-app error boundary and 404 *are* translated (`errors.*`).
- **Operator / configuration errors** — the Gemini and Supabase env messages in
  `src/lib/gemini.server.ts` and `src/lib/server-env.ts` name environment variables and Netlify
  settings. They address whoever deploys the app, and they interpolate model names and HTTP
  status codes, so the `serverErrors.*` slug lookup cannot key them anyway.
- **Deliberately untranslated identifiers** — the `admin` role name in
  `analytics.tsx:143`, the migration path `supabase/migrations/*_parent_student_links.sql` in
  `ParentPortal.tsx:1116`, unit tags like `187_MATH_FRACTIONS`, arcade mode/level/subject IDs,
  locale autonyms in the switcher, and `formatDuration`'s `H:MM:SS` separators.
- **Parent-authored content** — a title a parent typed has no catalog key and renders as
  entered. `tDb()` falls through to the stored text. Correct behavior.
- **Malformed-payload fallbacks** — `src/lib/lesson-payload.ts` supplies `Question {n}`,
  `Part {n}`, `Prompt {n}`, `Worksheet lesson`, and `Review the lesson notes and try again.`
  when a stored lesson payload is missing fields. These sit inside the lesson-content boundary
  and only surface for a degenerate payload.

## 5. Open items I did not change (recommendations, not defects)

I left these alone because each is either a behavior change or a correctness risk that an
English-copy audit should not decide unilaterally.

1. **Developer TODO in the accessibility tree.** `src/components/arcade/ArcadeHub.tsx:237`
   renders `<span className="sr-only">{ARCADE_XP_TODO}</span>`, where `ARCADE_XP_TODO`
   (`src/lib/arcade/questions.ts:77`) is the note *"Wire optional practice XP (e.g. +5–15
   once/day) without touching task mastery."* Screen-reader users hear it on every arcade hub.
   It should be **deleted**, not translated — but deleting UI is a product call. This is the one
   item I would escalate.
2. **Leaderboard date badge.** `src/components/DailyLeaderboard.tsx:46` renders the raw
   `YYYY-MM-DD` string from `getTodayEtDateString()`. Switching to `formatDateTime` would
   localize the digits, but naively — `new Date("2026-08-03")` parses as UTC midnight, which is
   the *previous* evening in Eastern time, so a date-styled render would show the wrong day for
   the app's own audience. A correct fix has to construct the date in ET first, so I left it.
3. **Duration digits.** `formatDuration(seconds, "clock")` builds `1:04:12` by hand, and
   `friendlyDuration` passes raw `hours`/`minutes`/`seconds` numbers into
   `leaderboard.duration.*`. Latin digits in Arabic. Cosmetic, and the fix belongs in
   `src/lib/daily-activity.ts` rather than in a catalog.
4. **Dead English in `src/lib`.** `unlockRuleCopy()` (`src/lib/arcade/progress.ts:221`) and
   `titleForLevel()` (`src/lib/gamification.ts:32`) both build English sentences that nothing
   renders — the UI uses `t("arcade.hub.unlockRule")` and `t(levelTitleKey(level))` instead.
   `LevelUpInfo.title` is populated from `titleForLevel` and never read. Harmless, but they are
   traps for the next person: someone will render one and reintroduce untranslated copy.
5. **Seven unused catalog keys.** `common.back`, `common.cancel`, `common.loading`,
   `common.locked`, `common.next`, `common.xp`, and `language.label` have no call site. They
   cost the `es`/`ar` auditors translation effort for nothing. I left them because the README
   asks for additive, not subtractive, catalog changes; drop them in a later sweep.
6. **Interpolated server errors.** Beyond the one I fixed, `serverErrors.*` structurally cannot
   cover any thrown message that interpolates a value, since the key is a slug of the finished
   sentence. The remaining ones are the operator/config messages in §4 plus
   `grading.functions.ts:137` and `:156`, both of which the client already pre-empts with
   `lesson.worksheet.answerRequired` and `lesson.worksheet.quizFirst`. No user-reachable gap
   remains, but the pattern is fragile: any new interpolated server throw is silently
   English-only. Worth a `README` warning or a lint rule.
7. **No language switcher on the public pages.** `LanguageSwitcher` is on `/auth` and the
   dashboard header only. A visitor on `/`, `/privacy`, `/auth/confirm`, or `/auth/confirmed`
   cannot switch manually — they get whatever `navigator.languages` implies. Adding it to the
   footer would cover every route in one place.

## 6. Language switcher verification (code-level)

- `src/components/LanguageSwitcher.tsx` renders a labelled `<select>` over `localeOptions()`,
  with `t("language.chooseAria")` on an `sr-only` `<label>` bound by `useId()`. Options show
  **autonyms** (`English`, `Español`, `العربية`) — correct; those should not be translated.
- Mounted at `src/routes/auth/index.tsx:199` and
  `src/routes/_authenticated/dashboard.tsx:170`, i.e. present before a session exists and after
  sign-in, as the README claims.
- `setLocale` writes `localStorage["shia-quest:locale"]` and updates React state, so the change
  applies without a reload. A `storage` listener in `I18nProvider` propagates it to other tabs.
- SSR renders `<html lang="en" dir="ltr">` and `I18nProvider` rewrites both attributes in a
  mount effect, which is why an Arabic preference does not cause a hydration mismatch.
- RTL is handled structurally: the canvas game reads its overlay labels from a ref
  (`DashGame.tsx:83`) so the render loop picks up a locale change without restarting, and
  layout uses logical properties (`ps-`, `pe-`, `me-`).

Not verified: actual rendering with `ar` selected in a browser. That is the main residual risk
and the reason confidence is 94% rather than higher.

## 7. Files changed by this audit

- `src/i18n/locales/en.json` — 5 keys added (§ "New keys" above). No existing key renamed,
  removed, or reworded.
- `src/components/LessonPractice.tsx` — score percentage through `common.percent`; client-side
  multipart part validation throwing `lesson.worksheet.partRequired`.
- `src/components/DailyLeaderboard.tsx` — best score through `common.percent`; pulled
  `formatNumber` from `useTranslation()`.
- `src/components/ParentPortal.tsx` — unit-tag placeholder through `t()`.
- `src/routes/_authenticated/admin/analytics.tsx` — bot tag through `t()`; three counts through
  `formatNumber`; `common.none` for the missing-path dash.
- `docs/i18n-audit-en.md` — this report.

`es.json` and `ar.json` were **not** touched. Nothing was committed.
