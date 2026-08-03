# Spanish (`es`) i18n Audit

**Date:** 2026-08-03
**Scope:** `src/i18n/locales/es.json` audited against `src/i18n/locales/en.json` (857 keys)
**Auditor:** independent audit pass (Spanish only)

## Verdict: **PASS**

Spanish is at full structural parity with English, placeholders are sound, no orphan keys
exist, and no untranslated English was left in the catalog. Five naturalness/accuracy fixes
were applied. One product-content observation (grammatical gender of gamification titles) is
recorded below as a non-blocking note rather than a defect, because changing award titles is
a product decision rather than a translation error.

**Confidence: 93%**

The 7% reserve covers the fact that quality was judged by reading strings in context of their
call sites rather than by exercising every screen in a running browser with `es` active, and
that a handful of arcade mode names are creative adaptations where a different translator
could reasonably choose other wording.

## 1. Parity check

`npm run i18n:check`, Spanish line, at the start and again at the end of the audit:

```
en.json: 857 keys

es.json: 857 keys · 0 missing · 0 orphan · 0 placeholder mismatch · 17 identical to English
```

> **Note on the script's exit code.** At the start of this audit the whole check passed. By the
> end it exits non-zero, but *only* because of `ar.json`: a parallel Arabic audit added the
> CLDR Arabic plural categories (`_zero`, `_two`, `_few`, `_many` on seven pluralized keys, 28
> keys total), and `scripts/i18n-check.mjs` counts any key absent from English as an orphan.
> Those forms are legitimate — `src/i18n/translate.ts` resolves plurals through
> `Intl.PluralRules` and its own comment states the design is so "Arabic and Spanish can add
> the forms they need without English having to declare them". The orphan rule simply does not
> exempt plural suffixes. This is an Arabic-side / checker-side item, outside this audit's
> scope, and it does not affect the Spanish result: `es.json` reports 0 missing, 0 orphan, and
> 0 placeholder mismatches both before and after the fixes below.

- **Missing keys:** 0
- **Orphan keys:** 0 (no key exists in `es.json` that is absent from `en.json`)
- **Placeholder mismatches:** 0 — every `{var}` set in `es` matches the English set for the
  same key, verified by the checker and independently re-verified for brace balance and
  nesting.
- **English keys gained during the parallel English audit:** none. `en.json` was unmodified
  for the duration of this audit (last write 10:31, before this pass began), so no sync into
  `es.json` was required. The parity check was re-run at the end of the audit and still
  reports 857/857.

### Structural checks (beyond the checker)

A separate script compared every `es` string to its English source for leading/trailing
whitespace, doubled spaces, unbalanced or nested braces: **0 problems**. This matters because
several keys are deliberate sentence fragments that the UI concatenates, and their leading
spaces are load-bearing — for example `taskboard.bestRetry`, `lesson.attemptsBestSuffix`,
`parent.progress.quizAttempts_one`, `parent.bookUploader.pdfAttached`. All preserved.

### Pluralization

`src/i18n/translate.ts` resolves plurals through `Intl.PluralRules` using the locale's BCP-47
tag, trying `<key>_<category>` then `<key>_other` then the bare key. Spanish's CLDR categories
are `one` and `other`, and every pluralized key in `es.json` supplies both forms
(`common.attempts`, `gamification.levelUp.multiLevel`, `taskboard.quizPlusWorksheet`,
`taskboard.practiceQuestions`, `parent.progress.quizAttempts`,
`parent.progress.videosAlreadyRight`, `parent.progress.videosUpdated`). Correct by
construction; no `_few`/`_many` needed.

### Strings identical to English (17) — all intentional

`footer.legalNavAria` (Legal), `footer.netlify` (brand), `gamification.streakValue`,
`gamification.xpOfNeeded`, `lesson.worksheet.score`, `book.feedback.score`,
`lesson.video.defaultChannel` (Crash Course Kids — channel name),
`parent.worksheetUploader.videoLine` ("Video: {title}" — *video* is Spanish),
`parent.progress.linkCodePlaceholder` (UUID mask), `parent.progress.studyMinutes`,
`parent.progress.subjectProgress`, `parent.progress.taskMeta`,
`arcade.mode.decimal-dash.accentLabel` (Decimal), `arcade.mode.racece-relay.accentLabel`,
`arcade.game.gateHeader`, `arcade.game.canvasLabel`,
`howto.shorts.student-books.scenes.2.emphasis` (RACECE). These are format strings, brand or
proper nouns, or words spelled the same in both languages — matching the exclusions named in
the audit brief.

## 2. Quality audit

A word-level scan flagged every ASCII token in `es.json` against an English-vocabulary list.
Every hit was a false positive: interpolation variable names (`{score}`, `{level}`, `{title}`),
the product name *Portal* (also a Spanish word, and used as a proper product name throughout),
literal database migration identifiers that must not be translated
(`lesson_drafts_from_pdf`, `secure_assigned_books_storage`, `parent_student_links`), the
timezone literal `America/New_York`, and *bots* (an established Spanish loanword). **No
untranslated English remains.**

Orthography and punctuation scans came back clean as well: no missing accents on the usual
suspects (*más, está, después, también, código, sesión, página, lección, matemáticas*), and
every interrogative or exclamatory sentence carries its opening `¿` / `¡`. Quotation uses
Spanish angle quotes (`«…»`) consistently where English uses curly double quotes.

### Terminology consistency (spot-verified against call sites)

Cross-references inside help content actually match the button labels a Spanish user will
see, which is the failure mode most likely to confuse a reader:

| Reference in help text | Actual UI label | Match |
| --- | --- | --- |
| `howto…parent-welcome.scenes.2` «Cambiar al Portal para Padres» | `dashboard.switchToParent` | yes |
| `howto…parent-link-student.scenes.2` «Vincular un estudiante» | `parent.progress.linkTitle` | yes |
| `howto…student-link-code.scenes.2` "Toca Copiar" | `common.copy` = Copiar | yes |
| `howto…student-lesson.scenes.1` emphasis "Aprende" | `lesson.phase.teach` = Aprende | yes |
| `auth.checkEmailNotice` «Correo confirmado» | `auth.confirmed.title` | yes |
| `auth.needParentAccountNote` «Crea una cuenta» | `auth.toggleToSignUp` tail | fixed (see F2) |

Glossary use is stable across the catalog: *Aventura* for Quest, *Portal para Padres* /
*Portal del Estudiante*, *examen* for quiz, *hoja de trabajo* for worksheet, *dominio /
dominada* for mastery, *código de enlace para padres* for parent link code, *racha* for
streak, *Maestro IA* / *Entrenador IA* for AI Teacher / AI Coach, *puertas* for arcade gates,
*Jefe* for Boss, *Guías rápidas* for How-to shorts.

### Interpolation values verified at the call site

Several Spanish strings only read correctly if the injected value has the shape the
translation assumes. These were checked against the components:

- `arcade.hub.modeStars` renders `N{level}` where `level` is `mp.unlockedIndex + 1`
  (`ArcadeHub.tsx`) — a bare number, so "N1" is a correct Spanish analogue of English "L1".
- `arcade.game.unlocked` and `arcade.hub.unlockedThrough` receive a *label*
  (`arcade.levels.*.label` → "Nivel 3", "Jefe"), which is what drove fix F3.
- `landing.titleLead` + `titleAccent` render as `{lead} <span accent>{accent}</span>`
  (`src/routes/index.tsx`). Spanish moves the highlight onto "Shia" —
  "La Aventura de 5.º Grado de **Shia**" — which reads naturally and keeps the accent span
  non-empty.
- `parent.taskCreator.body{Before,Link,After}` render as three space-joined fragments with a
  bold middle span (`ParentPortal.tsx`), which drove fix F5.
- `admin.analytics.loadErrorBefore` is followed in the component by the literal role name, so
  the Spanish fragment correctly ends open-ended ("…que el rol de tu perfil sea").

## 3. Fixes applied to `es.json`

All five are wording changes inside `es.json`. No English keys were added, no keys renamed, no
application code touched.

**F1 — `dashboard.showParentUpgrade`** (accuracy: wrong meaning)
`"Yo quería ser padre/tutor"` → `"Quería una cuenta de padre/tutor"`.
The original literally reads "I wanted to be a parent/guardian", i.e. a life aspiration,
which is not what the English "I meant to be a parent" says. This string is a button that
toggles the parent-account upgrade form open, so it has to express intent about the account.

**F2 — `auth.needParentAccountNote`** (consistency: quoted UI label did not exist)
`«Crear una cuenta»` → `«Crea una cuenta»`.
The note tells the user to choose a specific control, but the Spanish toggle button reads
"¿Primera vez aquí? Crea una cuenta" (imperative), so quoting the infinitive pointed at a
label that appears nowhere on screen.

**F3 — `arcade.hub.unlockedThrough`** (grammar: missing article)
`"Desbloqueado hasta {level}"` → `"Desbloqueado hasta el {level}"`.
`level` is always a label such as "Nivel 4" or "Jefe", and Spanish requires the article
before them: "Desbloqueado hasta el Nivel 4" / "…hasta el Jefe".

**F4 — `arcade.hub.continueMode`** (naturalness)
`"Continuar {mode}"` → `"Continuar con {mode}"`.
`mode` is a game-mode title ("Vuelo de Fracciones"). Spanish *continuar* takes *con* before a
noun phrase like this; the bare form reads like clipped machine output.

**F5 — `parent.taskCreator.bodyBefore`** (grammar: missing article across a concatenation)
`"…Para hojas de trabajo personalizadas, usa"` → `"…usa el"`.
The three fragments concatenate into one sentence, and without the article the result was
"usa borrador de lección con IA desde un PDF que está más arriba". Now: "usa **el borrador de
lección con IA desde un PDF** que está más arriba."

### Verification after fixes

- `npm run i18n:check` → `es.json`: 857 keys, 0 missing / 0 orphan / 0 placeholder mismatch
  (see the exit-code note in section 1 regarding `ar.json`).
- JSON re-parsed successfully; the five edited values re-read and confirmed.
- `npx tsc --noEmit` → the only errors are pre-existing and confined to
  `src/lib/analytics.ts`, `src/lib/analytics.functions.ts`, and `src/lib/daily-activity.ts`
  (`string | null` vs `string | undefined` mismatches). Zero errors reference `src/i18n`, and
  this audit changed JSON string values only, so it cannot have introduced them.

## 4. Non-blocking observations (not changed)

**Grammatical gender of gamification titles.** `gamification.defaultName` ("Explorador") and
most of `gamification.levelTitles` use masculine generics: *Explorador Curioso*, *Rastreador
de Habilidades*, *Constructor de Mentes*, *Campeón de la Concentración*, *Caballero del
Saber*, *Gran Erudito*, *Héroe de la Aventura*. Awarded to a female student these read as
mismatched. Several titles are already gender-neutral (*Principiante de la Aventura*, *Pro de
la Práctica*, *Leyenda de las Lecciones*, *Estrella de las Rachas*, *Dinamo del Distrito*),
so neutral rewrites of the rest are feasible. Left alone deliberately: masculine generic is
the conventional default in Spanish, these are flavor/award strings rather than instructions,
and renaming a product's level titles is a content decision for the owner. Flagged here so it
can be decided rather than discovered.

**Regional register.** Vocabulary leans neutral Latin-American, appropriate for the NYC
District 6 audience — *reporte* (not *informe*), *computadora*-family register, *jalones* in
`arcade.mode.force-field.blurb`. Internally consistent; no action needed.

**Creative arcade names.** A few mode titles adapt rather than translate literally, e.g.
`volume-vault` "Volume Vault" → "Salto de Volumen" (leaning on *vault* as vaulting, which fits
a jumping game, instead of *bóveda*). Defensible, and consistent with the playful tone of the
rest of the arcade copy.

## 5. Areas sampled

Read in full and judged in context: `auth` (including `validation`, `toast`, `confirm`,
`confirmed`), `dashboard` + `dashboard.upgrade`, `parent` (`worksheetUploader`, `taskCreator`,
`bookUploader`, `progress` including `status`), `arcade` (`subject`, all 24 `mode` entries,
`levels`, `hub`, `game`), `howto` (`player`, `menu`, all 11 shorts and their scenes),
`serverErrors` (all 26), plus `common`, `landing`, `gamification`, `leaderboard`, `linkCode`,
`subjects`, `tasks`, `taskboard`, `lesson` (including `worksheet`, `coach`, `video`, `toast`),
`scribble`, `pdf`, `book`, `admin.analytics`, `privacy`, `footer`, `errors`, `language`.

## 6. Re-sync (2026-08-03)

After English gained five new keys (`common.percent`, `lesson.worksheet.partRequired`, `parent.taskCreator.unitTagPlaceholder`, `admin.analytics.eventBotTag`, `admin.analytics.eventBotUnnamed`), Spanish fell behind at 857 vs 862; those five were added to `es.json` in Latin-American, Grade-5-friendly wording (placeholders preserved; the unit-tag example and bot tag format left as in English), and `npm run i18n:check` now reports `es.json: 862 keys · 0 missing · 0 orphan · 0 placeholder mismatch`.
