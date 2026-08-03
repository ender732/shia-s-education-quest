# Arabic (`ar`) i18n Audit

**Date:** 2026-08-03
**Scope:** `src/i18n/locales/ar.json` audited against `src/i18n/locales/en.json`, plus the RTL
wiring that Arabic depends on
**Auditor:** independent audit pass (Arabic only)

## Verdict: **PASS WITH GAPS**

Arabic is at full structural parity with English, placeholders are sound, there are no orphan
keys, and no untranslated English prose remains. The translation quality is genuinely good —
fluent MSA with correct diacritics where they disambiguate, a stable glossary, and RTL-aware
touches the English source could not have forced (mirrored arrows, `L{level}` expanded to
`المستوى`). Arabic sets `dir="rtl"` correctly.

It is not a clean PASS because two real defects were found and fixed, both invisible to the
parity checker:

1. **Arabic pluralization was wrong for most real counts.** Only `_one` and `_other` existed,
   so Arabic silently inherited English's two-form model. Arabic has six CLDR categories, and
   the single `_other` form was being used for 0, 2, 3–10, 11–99 and 100+ — which cannot be
   grammatical for all of them simultaneously. Counts of 11 and up rendered plural nouns where
   Arabic requires the singular (`15 محاولات` instead of `15 محاولة`), and the dual (n=2) was
   missing entirely.
2. **Letter-spacing was breaking the Arabic script.** 33 `tracking-*` utilities plus the
   `h1,h2,h3` heading rule applied letter-spacing to Arabic text. Arabic is cursive, so this
   pulls glyphs apart at their joins and renders words as disconnected letters.

A third class of issue — physical `left`/`right` CSS utilities that do not flip under
`dir="rtl"` — was fixed in the application components and is documented as remaining in the
vendored `src/components/ui/**` primitives.

**Confidence: 90%**

The 10% reserve: quality was judged by reading all 862 strings against their call sites and by
exercising the plural resolver programmatically, not by driving every screen in a browser with
`ar` active. Specifically unverified by eye are the actual rendered bidi behaviour of the
mixed-direction strings in section 5, and whether the `ui/**` primitives listed in section 4.3
are visibly wrong or already handled by Radix's `dir` support.

## 1. Parity check

`npm run i18n:check`, Arabic line, at the end of the audit:

```
en.json: 862 keys

ar.json: 892 keys · 0 missing · 0 orphan · 0 placeholder mismatch · 30 locale plural forms · 15 identical to English
```

- **Missing keys:** 0
- **Orphan keys:** 0
- **Placeholder mismatches:** 0
- **Locale-specific plural forms:** 30 (see section 3.1)

Arabic was at 857/857 parity when the audit began, confirming the claim in the brief.

> **Note on the script's exit code.** The check now exits non-zero, but only because of
> `es.json`, which is 5 keys behind after the parallel English audit added `common.percent`,
> `lesson.worksheet.partRequired`, `parent.taskCreator.unitTagPlaceholder`,
> `admin.analytics.eventBotTag` and `admin.analytics.eventBotUnnamed`. Spanish is out of scope
> for this audit and was not touched. Arabic reports 0/0/0.

### English keys gained during the parallel English audit — all synced

`en.json` grew from 857 to 862 keys while this audit was running. All five were translated into
`ar.json`:

| Key | English | Arabic |
| --- | --- | --- |
| `common.percent` | `{value}%` | `{value}%` (pure format string) |
| `lesson.worksheet.partRequired` | `Please complete: {prompt} — {part}` | `يُرجى إكمال: {prompt} — {part}` |
| `parent.taskCreator.unitTagPlaceholder` | `187_MATH_FRACTIONS` | unchanged — a literal unit-tag code |
| `admin.analytics.eventBotTag` | ` · bot:{name}` | ` · روبوت:{name}` |
| `admin.analytics.eventBotUnnamed` | `yes` | `نعم` |

`lesson.worksheet.partRequired` was matched to the register of its sibling
`lesson.worksheet.answerRequired` (`يُرجى كتابة أو رسم إجابة لـ: {prompt}`).

### Strings identical to English (15) — all intentional

`common.percent`, `gamification.streakValue`, `gamification.xpOfNeeded`,
`lesson.worksheet.score`, `book.feedback.score`, `parent.progress.subjectProgress`,
`parent.progress.taskMeta`, `arcade.game.gateHeader`, `arcade.game.canvasLabel` (pure format
strings); `footer.netlify`, `lesson.video.defaultChannel` (brand / channel names);
`parent.progress.linkCodePlaceholder` (UUID mask); `parent.taskCreator.unitTagPlaceholder`
(literal identifier); `arcade.mode.racece-relay.accentLabel` and
`howto.shorts.student-books.scenes.2.emphasis` (the RACECE acronym, kept as an acronym because
the method is taught by that name — the expansion is given in
`tasks.description.answer_the_prompt_using_restate_answer_cite_explain_cite_explain` and
`arcade.mode.racece-relay.blurb`).

No genuine untranslated English prose remains. A separate scan of every Latin-character run in
`ar.json` returned only proper nouns and identifiers that must stay Latin: `PDF`, `Google`,
`YouTube`, `Supabase`, `Netlify`, `XP`, `MIT`, `UTC`, `UTM`, `UUID`, `SQL`, `OAuth`, `RACECE`,
`NYSSLS`, `America/New_York`, and migration/bucket identifiers (`lesson_drafts_from_pdf`,
`secure_assigned_books_storage`, `parent_student_links`, `lesson-worksheets`,
`assigned-books`).

## 2. RTL wiring — verified correct

- `src/i18n/config.ts` declares `ar: { dir: "rtl", bcp47: "ar" }`.
- `I18nProvider` (`src/i18n/index.tsx`) writes both attributes on mount and on locale change:
  `root.setAttribute("lang", meta.bcp47)` and `root.setAttribute("dir", meta.dir)`.
- `src/routes/__root.tsx` server-renders `<html lang="en" dir="ltr">` and the provider rewrites
  it client-side. This is deliberate and commented — it keeps SSR markup and the first client
  render identical to avoid a hydration mismatch. The cost is that an Arabic user sees one LTR
  frame before hydration. Left as designed; changing it needs server-side locale negotiation,
  which is a larger architectural decision than this audit should make.
- `I18nProvider` is mounted in `__root.tsx`; `LanguageSwitcher` is reachable from
  `routes/auth/index.tsx` and `routes/_authenticated/dashboard.tsx`.
- `Intl.NumberFormat`/`Intl.DateTimeFormat` are constructed with the locale's BCP-47 tag, so
  Arabic numerals and dates format per locale.

No wiring changes were needed.

## 3. Fixes applied

### 3.1 Arabic CLDR plural forms (30 keys added to `ar.json`)

`src/i18n/translate.ts` already supports this: `candidates()` tries
`<key>_<category>` → `<key>_other` → bare key, using `Intl.PluralRules` for the active locale,
and its own comment states the design exists "so Arabic and Spanish can add the forms they need
without English having to declare them". Arabic simply had never supplied them.

Arabic's categories resolve as: `zero` = 0, `one` = 1, `two` = 2, `few` = 3–10, `many` = 11–99,
`other` = 100–102, 200–202… Grammatically that means plural (broken plural) for `few`,
singular for `many` and `other`, and the dual noun for `two`.

Full six-form sets were added for the seven pluralized keys, following CLDR's own Arabic
conventions — including keeping the numeral out of the `two` form, since the Arabic dual encodes
"two" in the noun itself (`محاولتان`), exactly as CLDR does for `duration-day` (`يومان`):

`common.attempts`, `gamification.levelUp.multiLevel`, `taskboard.quizPlusWorksheet`,
`taskboard.practiceQuestions`, `parent.progress.quizAttempts`,
`parent.progress.videosAlreadyRight`, `parent.progress.videosUpdated`.

Note this also required **correcting the existing `_other` form** on all seven: it held the
broken plural, which is right for 3–10 but wrong for the 11+ range that `_other` was actually
serving. The plural moved to `_few` and `_other`/`_many` now carry the singular.

`book.wordCount` gained only `_two` and `_few`. Its call site in `BookStudio.tsx` passes
`count`, but English declares no plural family, and the existing bare Arabic value
(`{count} كلمة`) is already the correct singular for `zero`, `one`, `many` and `other` — so only
the dual and paucal forms were needed.

Verified by replicating `candidates()`/`translate()` against the real catalogs across
n = 0, 1, 2, 3, 5, 10, 11, 15, 99, 100, 101 for all eight families: **0 lookup misses**, and
every category resolved to its exact intended form. Sample (`common.attempts`):

```
n=  0 [zero ] 0 محاولة        n= 11 [many ] 11 محاولة
n=  1 [one  ] 1 محاولة        n= 15 [many ] 15 محاولة
n=  2 [two  ] محاولتان        n= 99 [many ] 99 محاولة
n=  3 [few  ] 3 محاولات       n=100 [other] 100 محاولة
n= 10 [few  ] 10 محاولات      n=101 [other] 101 محاولة
```

`parent.progress.videosUpdated` is the one family that keeps the numeral in its `two` form,
because the counted noun there follows the rendered `{scanned}` value rather than `{count}`
(which is used only for category selection and is never printed).

### 3.2 Translation corrections (4 keys)

**`admin.analytics.noCrawlers`** — `"لا توجد زواحف معروفة بعد."` → `"لا توجد برامج زحف معروفة بعد."`
`زواحف` is the zoological plural for *reptiles*. The English is "No known crawlers yet", meaning
web crawlers. `برامج زحف` is the correct computing term and matches the `الروبوتات` wording used
by the neighbouring `botSessions` / `botsVsHumans` keys.

**`parent.progress.noReports`** — `"لا توجد إرساليات بعد."` → `"لا توجد تقارير مُرسَلة بعد."`
`إرساليات` means *consignments/shipments*. The section is "Recent AI-graded book reports", so the
empty state is about submitted reports.

**`arcade.mode.ecosystem-escape.blurb`** — `"المنتجات والمستهلكات والمُفكِّكات…"` →
`"الكائنات المنتِجة والمستهلِكة والمُحلِّلة…"`
Two problems in one science string. Unvocalized `المنتجات` reads as *the products*
(al-muntajāt), not *the producers* (al-muntijāt), and `المُفكِّكات` is not the standard term for
decomposers — Arabic curricula use `المُحلِّلات`. The replacement uses the conventional
`الكائنات المنتِجة والمستهلِكة والمُحلِّلة` phrasing, which is unambiguous without relying on
diacritics.

**`parent.progress.viewing`** — `"تعرض"` → `"المعروض"`
This is a static label sitting before a student `<select>` in `ParentPortal.tsx`. `تعرض` is a
second-person verb ("you display"), which reads as an instruction rather than a label.
`المعروض` ("shown") works as the noun label the layout expects.

### 3.3 Arabic letter-spacing (`src/styles.css`)

One unlayered rule was added:

```css
html[lang="ar"],
html[lang="ar"] * {
  letter-spacing: normal;
}
```

Arabic is cursive; positive `letter-spacing` separates letters at their joins and the negative
`-0.02em` on `h1,h2,h3` crushes them. 33 `tracking-*` utilities are applied to translated label
text across the app (`tracking-wider` ×25, `tracking-widest` ×4, `tracking-wide` ×4), plus every
heading.

Fixing this centrally is why the rule is left **outside** `@layer base`: Tailwind emits its
utilities inside `@layer utilities`, and cascade layers beat specificity, so a layered rule can
never override `.tracking-wider` no matter how specific it is. Unlayered rules outrank all
layered ones. Verified in the built bundle: `.tracking-wider` sits at brace depth 1 inside
`@layer utilities`, while `html[lang=ar]` is emitted at depth 0, unlayered.

The paired `uppercase` utilities are harmless — Arabic has no letter case, so they are no-ops.

### 3.4 Physical → logical CSS properties (42 substitutions, 16 files)

Under `dir="rtl"` a physical utility like `text-left` forces left alignment even though the
paragraph direction is right-to-left, so Arabic text was being left-aligned inside a
right-to-left layout. Tailwind's logical equivalents resolve against direction and are exact
no-ops in LTR, so English and Spanish rendering is unchanged.

Applied across `src/**` excluding the vendored `src/components/ui/**`:

| From | To | Count |
| --- | --- | --- |
| `text-left` / `text-right` | `text-start` / `text-end` | 22 |
| `ml-*` / `mr-*` | `ms-*` / `me-*` | 12 |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` | 6 |
| `left-0` / `right-0` | `start-0` / `end-0` | 2 |

All 40 mechanical substitutions were re-read in context to confirm each landed on a real class
name rather than on prose or a JS identifier. The two positioning changes were made by hand
because they need judgement:

- `TaskBoard.tsx` — the coloured accent stripe is `absolute inset-y-0 left-0`, paired with
  `ps-2` content padding. In RTL the padding flipped to the right while the stripe stayed on the
  left, so the stripe overlapped the text. Now `start-0`.
- `howto/HowToHelpMenu.tsx` — the help dropdown is anchored `absolute right-0` to its trigger.
  In RTL the trigger sits on the opposite side, so the panel detached from it. Now `end-0`.

Deliberately left physical: the two decorative blur gradients in `LevelUpCelebration.tsx`
(`-left-16`, `-right-12`), which are off-canvas glows with no reading order.

### 3.5 `scripts/i18n-check.mjs` — teach it about locale plural forms

The checker counted any key absent from `en.json` as an orphan, which directly contradicts the
documented design in `translate.ts` and would have failed CI on every legitimate Arabic plural
form. It now resolves `<base>_<category>` keys against the English base they vary, and reports
them in a dedicated `locale plural forms` column.

This makes the check stricter, not looser. It still fails on:

- a bogus category (`attempts_dual` — `dual` is not a CLDR category for `ar`)
- a typo'd base (`attmepts_few`)
- a placeholder a plural form invents but English never defines (`{coutn}`)

A plural form is now allowed to *drop* a placeholder, because the Arabic dual legitimately does
so, but never to introduce an unknown one. All three failure modes were confirmed to still exit
non-zero by temporarily injecting them, and the injected keys were removed afterwards.

## 4. Non-blocking observations (not changed)

### 4.1 Counted nouns that cannot be pluralized without a code change

Several strings interpolate a count under a variable name other than `count`, so
`translate()` cannot select a plural category for them. They are stuck with one fixed noun
form:

| Key | Arabic noun form | Correct for | Wrong for |
| --- | --- | --- | --- |
| `lesson.worksheet.inkProgress` | `حقول` (plural) | 3–10 | 1, 2, 11+ |
| `arcade.hub.starsTotal` | `نجمة` (singular) | 1, 11+ | 2–10 |
| `arcade.hub.gatesToUnlock`, `arcade.game.runSummary` | `بوابة` (singular) | 1, 11+ | 2–10 |
| `parent.progress.levelAndStreak` | `يوم` (singular) | 1, 11+ | 2–10 |
| `parent.progress.studyMinutes` | `دقيقة` (singular) | 1, 11+ | 2–10 |
| `book.wordCount` | now fully handled | — | — |

Most of these already chose the singular, which is right for 1 and for the whole 11–99 band —
the commonest real values — so the residual error is narrow. Fixing them properly means passing
`count` alongside the display variable at the call site (as `videosUpdated` already does), which
is an application-code change in components the parallel English audit is editing. Recommended
as a follow-up rather than done here to avoid conflicting edits.

### 4.2 English-side plural bug found while testing (handoff to the English audit)

`book.wordCount` has no `_one` form in `en.json`, so English renders **"1 words"** at one word.
Not fixed here because `en.json` is the parallel audit's file; flagged so it is not lost. Arabic
is unaffected — its `_one` case is correctly served by the bare singular.

### 4.3 Vendored `ui/` primitives still use physical properties

21 files under `src/components/ui/**` still contain `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`/
`text-left`/`text-right`, concentrated in the menu primitives (`menubar`, `dropdown-menu`,
`context-menu`, `sidebar`, `carousel`, `select`, `navigation-menu`, `pagination`). These are
shadcn-generated files. Left untouched on purpose: they are regenerated from upstream, several
are Radix components that respond to a `dir` prop rather than to CSS alone, and
`calendar.tsx` already carries explicit `rtl:` variants — so an indiscriminate sweep could
double-correct. Worth a dedicated pass with the RTL UI open in a browser.

### 4.4 Mirrored arrows — deliberate and correct

Arabic flips the direction of arrow glyphs that English uses to mean "leads to":
`privacy.backHome` (`← Back home` → `→ العودة إلى الرئيسية`),
`parent.worksheetUploader.title`, `parent.progress.fixVideosNote`,
`howto.shorts.student-link-code.scenes.3.caption`. This is right: the bidi algorithm does not
mirror arrow characters, so the glyph has to be swapped in the string itself.

### 4.5 Landing page has no language switcher

`LanguageSwitcher` appears only on the auth page and the dashboard. The landing page and privacy
page are fully translated but offer no way to switch, so a first-time Arabic visitor sees
English unless their browser language triggers `detectBrowserLocale()`. Product decision, not a
translation defect.

### 4.6 Split-headline handling

`landing.titleLead` + `landing.titleAccent` render as `{lead} <span accent>{accent}</span>`.
Arabic splits them as `رحلة شيا في` + `الصف الخامس`, moving the highlight onto "the 5th grade"
rather than "Quest". The concatenation reads naturally and the accent span stays non-empty.

## 5. Mixed-direction strings worth eyeballing in a browser

Correct in the catalog, but these interleave RTL prose with LTR runs, where rendering depends on
the bidi algorithm and surrounding markup rather than on the string:

- `parent.progress.linkCodePlaceholder` — a UUID mask inside an RTL input.
- `leaderboard.resetNote` — `America/New_York` inside parentheses; paired RTL brackets around an
  LTR run are a classic bidi trouble spot.
- `parent.worksheetUploader.missingWorksheetBucket`, `parent.bookUploader.missingBooksBucket`,
  `parent.progress.linkSchemaMissing` — snake_case migration identifiers mid-sentence.
- `admin.analytics.eventBotTag` (` · روبوت:{name}`) — a Latin bot name after an Arabic label and
  a colon.
- `leaderboard.duration.*` — `{hours} س {minutes} د {seconds} ث`, three number+unit pairs in
  sequence.
- `lesson.quizAndWorksheetScore`, `taskboard.best`, and the `parent.progress.status.*` family —
  percentages adjacent to Arabic text.

## 6. Areas sampled

All 862 keys were read side by side with their English source. Judged against call sites:
`common`, `language`, `footer`, `errors`, `landing`, `auth` (incl. `validation`, `toast`,
`confirm`, `confirmed`), `dashboard` + `upgrade`, `gamification` (incl. `levelTitles`,
`levelUp`), `leaderboard`, `linkCode`, `subjects`, `tasks`, `taskboard`, `lesson` (incl.
`worksheet`, `coach`, `video`, `toast`), `scribble`, `pdf`, `book` (incl. `feedback.racece`),
`parent` (`worksheetUploader`, `taskCreator`, `bookUploader`, `progress` incl. `status`),
`arcade` (`subject`, all 24 `mode` entries, `levels`, `hub`, `game`), `howto` (`player`, `menu`,
all 11 shorts and their scenes), `admin.analytics`, `privacy`, and all 26 `serverErrors`.

## 7. Verification summary

- `npm run i18n:check` → `ar.json`: 892 keys, 0 missing / 0 orphan / 0 placeholder mismatch,
  30 locale plural forms. Non-zero exit traced entirely to `es.json` (section 1).
- Checker negative-tested against a bogus plural category, a typo'd base and an unknown
  placeholder — all three still fail the build.
- Plural resolution replayed against the real catalogs over 11 counts × 8 key families —
  0 misses, every category exact.
- `npx tsc --noEmit` → 33 errors, all pre-existing and confined to `src/lib/analytics.ts`,
  `src/lib/analytics.functions.ts` and `src/lib/daily-activity.ts` (`string | null` vs
  `string | undefined`). None in any file this audit touched.
- `npm run build` → succeeds. The Arabic letter-spacing rule was confirmed present and unlayered
  in the compiled stylesheet.

## 8. Files changed

| File | Change |
| --- | --- |
| `src/i18n/locales/ar.json` | 30 plural forms added, 4 mistranslations corrected, 5 new English keys synced |
| `src/styles.css` | one unlayered rule neutralizing letter-spacing for Arabic |
| `scripts/i18n-check.mjs` | recognizes and validates locale-specific CLDR plural forms |
| 16 component/route files | physical → logical direction utilities (no-op in LTR) |

`es.json` was not touched. No commits were made.
