# Accessibility — WCAG 2.2 Level AA

Target: **WCAG 2.2 Level AA** for screen-reader and keyboard users on non-arcade surfaces.

## Out of scope

- **DashGame / ArcadeHub gameplay canvas** and in-loop arcade controls (canvas-based QTE gameplay). Hub chrome outside the game loop was left as-is aside from existing structure; full arcade a11y is a separate effort (alternate non-canvas mode, live region question flow, etc.).
- Full visual redesign for contrast edge cases (see Gaps).

## Fixed in this pass

### Landmarks & structure

- Skip link (`SkipToMain`) on every page → `#main-content`.
- `main` + `id="main-content"` + `tabIndex={-1}` on landing, auth, dashboard, privacy, admin analytics, and error/404 shells.
- Dashboard toolbar wrapped in `<nav aria-label={t("a11y.mainNavAria")}>`.
- Parent portal sr-only `h2`; TaskBoard / leaderboard / gamification use section headings; leaderboard table has `caption` + `scope` on headers.
- Subject tabs remain a labeled `nav` with `aria-pressed`.

### Forms & labels

- Auth: visible or `sr-only` labels associated via `htmlFor` / `id` for email, password, display name, parent email; DOB/checkbox already labeled; account path as `role="group"` with `aria-pressed`.
- BookStudio: chapter + report labels wired with `htmlFor`; book picker uses `listbox` / `option` + `aria-selected`.
- Parent link code: email field labeled; code exposed with `aria-label`.
- Parent Portal student selector: explicit `<label>` + `aria-label`.
- Lesson short-answer inputs labeled; choice questions use `radiogroup` / `radio` + `aria-checked`.

### Icon-only / decorative

- Icon-only PDF controls, book remove, help close, unlink, dialog/sheet close: `aria-label` or i18n `sr-only` (`common.close`).
- Decorative Lucide icons marked `aria-hidden` across dashboard chrome, lessons, books, howto, landing, auth.

### Focus & keyboard

- Global `:focus-visible` ring in `styles.css`.
- `input-base` uses `:focus-visible` border + ring (not mouse-only outline removal without replacement).
- Language switcher no longer forces `outline-none`.
- Task card “Start/Retry” affordance also shows on `:focus-visible`.

### Live regions & status

- Quiz answer feedback, lesson results, book feedback card: `role="status"` / `aria-live="polite"`.
- Progress bars: level XP + quiz progress expose `role="progressbar"` (+ valuetext where useful).
- Loading states: `role="status"` / `aria-busy` where appropriate.
- PDF page + zoom counters: `aria-live="polite"`.
- Toasts: Sonner (live region) with `closeButton` enabled.
- Auth check-email notice: `role="status"`.

### Images

- Subject tab images keep empty `alt=""` (label is in the button text).
- Footer Netlify badge retains meaningful `alt`.

### i18n

- New user-facing a11y strings under `a11y.*`, auth label keys, `linkCode.emailLabel` / `codeAria`, `common.close` in **en / es / ar**.

## Gaps / known limitations

| Area | Notes |
|------|--------|
| **Arcade / DashGame** | Canvas gameplay not made accessible. |
| **Contrast** | Dark theme primary / XP accents are generally strong; **`text-muted-foreground` on small UI** may sit near the 4.5:1 boundary on some backgrounds. Raising muted contrast safely needs a broader token pass — **flagged, not redesigned**. White text on subject-tab photo overlays depends on image darkness. |
| **How-to help menu** | Keyboard open/close works; no full focus trap / arrow-key menu pattern (Escape closes the short player only). |
| **ScribblePad** | Drawing surface has region label + undo/clear aria; freehand ink is not text-equivalent (typed worksheet fields remain the accessible answer path). |
| **PDF text layer** | Relies on pdf.js text layer when present; scanned PDFs remain image-only. |
| **Confetti / motion** | Decorative; no `prefers-reduced-motion` hardening in this pass. |
| **Admin charts** | Recharts visuals are not fully described for SR users (summary cards carry the key numbers). |

## Manual test notes (VoiceOver / NVDA)

### Prep

1. Build/run the app; sign in as student and (separately) parent.
2. Set language to English, then spot-check Spanish and Arabic (`html lang` / `dir`).

### VoiceOver (macOS Safari or Chrome)

1. **Skip link** — Tab once from load; hear “Skip to main content”; activate; focus lands on `#main-content`.
2. **Auth** — Rotor → Form Controls: email/password labeled; signup path buttons announce pressed state.
3. **Dashboard** — Landmarks: Main + Account and tools nav + Subjects nav + footer Legal nav.
4. **TaskBoard** — Each lesson button announces title + status (perfect/mastered/incomplete).
5. **Lesson quiz** — Progressbar updates; after Check Answer, polite live region reads correct/not yet + explanation; choice radios announce checked / correct / incorrect.
6. **Worksheet** — Field prompts as headings; scribble labeled; typed optional fields labeled.
7. **BookStudio** — Book listbox selection; report labels; after grade, feedback region announces score/checklist.
8. **How-to** — Help button expands menu; Close has name; short player dialog titled; Escape closes player.
9. **Parent portal** — Link-student form fields labeled; unlink icon buttons named; student select labeled.

### NVDA (Windows Firefox or Chrome)

Same checklist. Confirm:

- Browse mode landmarks (D / insert+F7).
- Forms mode on auth and book report.
- Live regions announce toast + quiz feedback without stealing focus.
- Focus ring visible when tabbing (not only mouse click).

### Arabic RTL

- Skip link and focus order remain logical; language switcher and nav still operable.

## Regression checklist

- [ ] Skip link visible only on keyboard focus
- [ ] No unlabeled icon-only buttons in student/parent chrome
- [ ] Auth + BookStudio submit still work
- [ ] Lesson quiz keyboard-only completable
- [ ] en/es/ar strings present for new keys
