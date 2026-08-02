# Product Design Review — Shia's 5th Grade Quest (v1)

| Field | Value |
| --- | --- |
| **Product** | Shia's 5th Grade Quest |
| **Document** | Product Design Review / Product Requirements (PDR) |
| **Version** | v1 |
| **Date** | August 2026 |
| **Status** | Draft for stakeholder review |
| **Audience** | Parents/guardians, school community, contributors |
| **Production** | [https://shiadiaz.netlify.app](https://shiadiaz.netlify.app) |
| **License** | MIT (non-commercial educational community project) |

---

## 1. Executive summary

**Shia's 5th Grade Quest** is a gamified learning web app for Grade 5 students at **P.S./I.S. 187 Hudson Cliffs** (NYC District 6), with a linked **Parent Portal**.

Students practice **Math**, **ELA / Reading**, **Science (NYSSLS)**, and **Social Studies (Western Hemisphere)** through curriculum lessons (teach → quiz → optional AI worksheet), earn **XP / levels / streaks**, compete on a **daily leaderboard**, play **Subject Arcades** (dash campaigns with Levels 1–4 + Boss), and submit **AI-graded RACECE book reports** on parent-assigned PDFs.

Parents verify as adults (18+), link to a child via a shareable **link code**, create tasks, upload worksheets/books, and monitor mastery, attempts, and reports — only for students they have linked.

v1 is a working product on Netlify + Supabase. Optional Gemini powers AI grading, lesson drafts, and the lesson coach; without those keys, core lesson quizzes and arcade still run.

---

## 2. Product vision & goals

### Vision

A summer-bridge / ongoing practice home for one school's Grade 5 cohort: practice that feels like a quest, with parents able to assign work and see real progress — not a generic ed-tech marketplace.

### Goals (v1)

1. **Mastery-first practice** — pass lessons at ≥70%, retry until 100%, with attempt counts parents can see.
2. **Clear dual portals** — student learn/play; verified parent assign/monitor.
3. **Engagement without polluting mastery** — Subject Arcades award practice stars only; lesson XP stays on TaskBoard / Book Studio.
4. **Curriculum-aligned content** — unit-tagged lessons aligned to NYS Grade 5 / school context (`187_*` unit tags).
5. **Privacy by link** — parents see only linked students (RLS + app gates).

### Non-goals (see §5)

School SIS sync, teacher classroom rostering, native mobile apps, paid subscriptions, multi-district SaaS.

---

## 3. Users & personas

| Persona | Role in app | Needs |
| --- | --- | --- |
| **Shia / Grade 5 student** | `profiles.role = student` | Subject practice, XP/streaks, arcade play, book reports, share link code with parent |
| **Parent / guardian** | `profiles.role = parent` (18+ DOB + confirmation) | Link child, assign books/tasks/worksheets, see mastery & reports |
| **Admin** (ops) | `profiles.role = admin` (SQL only) | Site analytics at `/admin/analytics` |

**Access model**

- Student signup collects **parent/guardian contact email** (for optional Resend link-code email).
- Parent signup (or upgrade from student) requires **DOB ≥ 18** and guardian confirmation.
- Same account can switch **Student View ↔ Parent Portal** when role is parent/admin.
- Students may self-upgrade via “I meant to be a parent” after adult verification.

---

## 4. Scope

### 4.1 In scope for v1

| Area | Status | Notes |
| --- | --- | --- |
| Auth (email/password + Google OAuth) | **In** | Confirm → `/auth/confirm`; adult gate for parents |
| Student dashboard | **In** | Subjects, XP header, streak, link code, leaderboard |
| Curriculum TaskBoard + LessonPractice | **In** | ~27 unit lessons; teach / quiz / results; videos + coach |
| Mastery / perfect / attempts | **In** | ≥70% mastery XP once; retry to 100%; `attempt_count` |
| Parent Portal | **In** | Link/unlink, tasks, PDF books, worksheet→AI draft, progress |
| Book Studio + RACECE AI grading | **In** | Needs `GEMINI_API_KEY` for grading |
| Subject Arcades (all 5 subjects) | **In — complete** | Shared dash engine; L1–L4 + Boss; local stars |
| How-to shorts & tours | **In** | Student + parent contextual tips |
| Daily leaderboard (ET) | **In** | Time + best score today |
| Admin analytics | **In** | Admin role only |
| Privacy page | **In** | `/privacy` |
| Deploy on Netlify | **In** | `dist/client` |

### 4.2 Explicitly out of scope (v1)

- Arcade progress sync to Supabase / cross-device arcade state
- Arcade XP on profile (explicit TODO in code; practice stars only)
- Teacher/class roster, school SSO, gradebook export
- Native iOS/Android apps
- Real-time multiplayer arcade
- Full district curriculum CMS / content authoring UI beyond parent PDF draft publish
- Commercial billing / multi-tenant white-label

### 4.3 Optional / degraded without keys

| Capability | Env | Without key |
| --- | --- | --- |
| Book report + worksheet AI grading | `GEMINI_API_KEY` | Features error / unavailable |
| Lesson coach chat | Gemini | Coach unavailable |
| Parent PDF → lesson draft | Gemini | Draft generation unavailable |
| Email link code to parent | `RESEND_API_KEY` | Manual copy from dashboard still works |

---

## 5. Core user journeys

### 5.1 Student: learn → quiz → mastery / retry

1. Sign in → `/dashboard` (Student Portal).
2. Pick a subject tab → TaskBoard lists unit lessons (non-draft).
3. Open lesson → **teach** (notes, optional YouTube, Lesson Coach) → **quiz** (choice/short answers).
4. Score saved to `task_progress` (best score kept; attempts incremented).
5. **≥70%** → mastery; `xp_reward` applied **once** to `profiles.xp_points` (500 XP/level).
6. If mastered but **&lt;100%**, UI encourages **retry for perfect**.
7. Parent-published worksheet lessons: pass quiz first, then AI-graded worksheet (both ≥ pass%) for mastery path.

### 5.2 Student: Assigned Reading → Book Studio

1. Subject **Assigned Reading** → Book Studio (+ Reading Arcade hub above).
2. Open assigned PDF (signed URL from `assigned-books` bucket).
3. Write report (≥40 chars) → AI grades RACECE → XP by score bands (75–250).
4. Parent sees linked reports in Progress Monitor.

### 5.3 Student: Subject Arcade engagement

1. On any subject tab, **ArcadeHub** appears above TaskBoard / Book Studio.
2. Mode recommended from incomplete unit tasks when possible.
3. Play Levels **1→4→Boss**; unlock next by **finishing the track** or **7 correct gates** (gates bank across runs).
4. Earn **1–3 practice stars** per clear; campaign progress in **localStorage** only.
5. Return to TaskBoard for real mastery XP.

### 5.4 Parent: link → assign → monitor

1. Parent account (or upgrade) → switch to Parent Portal.
2. Enter student’s **link code** → `parent_student_links`.
3. Optionally: upload worksheet PDF → AI draft → review → publish; create manual tasks; upload assigned books.
4. Progress Monitor: XP/level/streak, mastery % by subject, per-lesson best score + attempts, daily activity, book reports.
5. Unlink student or delete own tasks/books as needed (RPC-guarded deletes).

---

## 6. Feature inventory by area

### 6.1 Auth & roles

- Routes: `/auth`, `/auth/confirm`, `/auth/confirmed`; authenticated shell redirects to `/auth` if no session.
- Email signup paths: **student** vs **parent**; Google OAuth with stored signup intent.
- Roles: `student` | `parent` | `admin`. Parent portal gated by `canAccessParentPortal`.

### 6.2 Student dashboard

- Gamification header (name, XP bar, level title, streak).
- Parent link code card (copy + optional Resend).
- Daily leaderboard (“Today’s Quest Challenge”, America/New_York midnight reset).
- Subject tabs from `subjects` table.
- How-to tour + contextual shorts + Help menu.

### 6.3 Lessons & TaskBoard

- Tasks from Supabase; curriculum resolved via `unit_tag` → `src/lib/curriculum.ts` or `lesson_payload` for published drafts.
- LessonPractice phases: teach → quiz → (worksheet if payload) → results.
- LessonVideo (YouTube embeds), ScribblePad for worksheet ink, LessonCoach (Gemini).
- Sort: incomplete → mastered-not-perfect → perfect.

### 6.4 Parent Portal

| Module | Behavior |
| --- | --- |
| WorksheetLessonUploader | PDF → `lesson-worksheets` → Gemini draft task (`is_draft`) → publish/discard |
| BookUploader | PDF → `assigned-books` + prompt; assign to linked students |
| TaskCreator | Manual task + unit_tag + XP reward |
| ProgressMonitor | Link by code, unlink, mastery, attempts, activity, reports; rematch videos helper |

### 6.5 Book Studio

- List assigned books; lazy PdfReader; RACECE checklist feedback; level-up celebration on XP.

### 6.6 Subject Arcades — **complete for v1**

All five dashboard subjects ship with a playable Arcade hub (not a Math-only prototype).

| Subject (DB title) | Hub | Campaign | Default mode |
| --- | --- | --- | --- |
| Math | Math Arcade | Number Dash Campaign | Number Dash |
| ELA / Reading | ELA Arcade | Story Dash Campaign | Story Sprint |
| Science (NYSSLS) | Science Arcade | Matter Dash Campaign | Matter Dash |
| Social Studies (Western Hemisphere) | Social Studies Arcade | Map Dash Campaign | Map Dash |
| Assigned Reading | Reading Arcade | Vocab Voyage Campaign | Vocab Voyage |

**Shared implementation**

- Lib: `src/lib/arcade/` (types, levels, progress, questions, subject catalogs).
- UI: `src/components/arcade/ArcadeHub.tsx`, `DashGame.tsx`.
- Legacy Math paths (`math-arcade*`) are thin compatibility shims → shared arcade.

**Ladder & unlock**

- Levels **L1, L2, L3, L4, Boss** (`ARCADE_LEVELS`).
- Unlock next: clear the track **or** bank **7** correct portal gates (`ARCADE_GATES_TO_UNLOCK`); gates persist across failed runs on that level.
- Boss uses a portal gauntlet + intensified theme (`intensifyBossTheme`).

**Visual identity (distinct per category)**

| Subject | Palette family |
| --- | --- |
| Math | Teal / cyan |
| ELA | Coral / amber |
| Science | Green / lime |
| Social Studies | Navy / ochre |
| Reading | Indigo / gold |

Boss runs darken/intensify that subject’s palette rather than using a shared generic boss world.

**Progress & rewards**

- Storage key: `arcade:v1:{userId}:{subjectKey}` (localStorage); Math migrates from `math-arcade:v1:` once.
- Practice **stars** only (1–3 per clear); **does not** write `profiles.xp_points` or `task_progress`.
- Optional tiny practice XP is an explicit code TODO (`ARCADE_XP_TODO`) — **out of v1 acceptance**.

**Modes** — multiple topic modes per subject (all `engine: "dash"`, `playable: true`), unit-tag matched where possible (e.g. Fraction Flight ↔ `187_MATH_FRACTIONS`).

### 6.7 How-to system

- Catalog in `howto-shorts.ts`; contextual overlays; first-run tours; Help replay.
- Progress/lock helpers in local storage (`howto-progress`, `howto-lock`).

### 6.8 Admin analytics

- `/admin/analytics` — page views, visitors, bots, signups/logins/shares (Supabase analytics tables + RPCs).

---

## 7. Gamification & progress rules

| Rule | Value / behavior |
| --- | --- |
| Level size | **500 XP** per level (`XP_PER_LEVEL`) |
| Level titles | Rotating kid-friendly titles → “Quest Hero · Rank N” |
| Lesson mastery | Score **≥ 70%** (`MASTERY_SCORE_MIN`); default `passPercent` on curriculum lessons |
| Perfect | **100%**; retries encouraged after mastery |
| Lesson XP award | **Once** on first mastery (`xp_awarded`); retries improve best score only |
| Attempts | `attempt_count` + `last_attempt_at` on every scored attempt |
| Streak | Daily visit bumps `streak_days` if consecutive calendar day; else reset to 1 |
| Book report XP | 75 / 100 / 150 / 200 / 250 by score bands (`xpForScore`) |
| Daily leaderboard | Seconds spent + best quiz score that ET day |
| Arcade | Practice stars only; separate from mastery |

Local fallback: task progress may mirror to `localStorage` if remote select fails; primary source of truth is Supabase when available.

---

## 8. Non-functional requirements

### Auth & security

- Supabase Auth; route guard on `/_authenticated/*`.
- RLS on profiles, tasks, progress, links, books, reports, storage.
- Parents read progress only for **linked** students (`fetchTaskProgressForStudents`).
- Security headers in `netlify.toml` (HSTS, CSP with YouTube + Supabase allowlists, etc.).
- Storage: private buckets `assigned-books`, `lesson-worksheets`; PDF size cap ~15 MB.

### Privacy

- Public policy at `/privacy` (account data, role/age, learning activity, uploaded files; no sale of PII).
- Parent age verification for guardian features.
- Student–parent association is opt-in via link code.

### Platforms

- Responsive web (desktop + mobile browsers).
- No native apps in v1.
- Primary deploy: **Netlify**; build `npm run build`, publish `dist/client`.

### Reliability / ops

- Migrations in `supabase/migrations/` (apply via `supabase db push`).
- Optional services degrade gracefully (email / AI).

---

## 9. Tech architecture overview

```
Browser (React 19)
  └─ TanStack Start / Router / Query
       ├─ Client Supabase (Auth, Realtime-ready Postgres, Storage)
       └─ Server functions (Netlify) → Gemini, Resend, privileged ops
Supabase Postgres + RLS + Storage
Netlify CDN + SSR adapter (@netlify/vite-plugin-tanstack-start)
```

| Layer | Choice |
| --- | --- |
| App | TanStack Start + React 19 + Vite 8 |
| UI | Tailwind CSS 4, Radix/shadcn-style, Framer Motion, Lucide |
| Data / Auth | Supabase (Auth, Postgres, Storage, RLS) |
| Hosting | Netlify |
| Optional AI / email | Google Gemini, Resend |

**Key data tables:** `profiles`, `subjects`, `tasks`, `task_progress`, `parent_student_links`, `assigned_books`, `book_reports`, `daily_activity`, `worksheet_submissions`, `analytics_*`.

---

## 10. Success metrics / v1 acceptance

v1 is **accepted** when stakeholders can verify:

1. **Student** can sign up/in, complete a curriculum quiz to ≥70%, see XP/level update once, retry to improve toward 100%, and see attempt count reflected for a linked parent.
2. **Parent** (18+) can link via code, upload a book or create a task, and view that student’s mastery/reports — and cannot see unlinked students.
3. **Book Studio** grades a report when Gemini is configured (RACECE checklist + score).
4. **All five Subject Arcades** load, play L1–Boss campaigns with correct subject palettes, persist stars locally, and leave profile lesson XP unchanged.
5. **Daily leaderboard** shows today’s activity after practice (when migration applied).
6. **Production** build deploys on Netlify; privacy page reachable; auth confirm URLs configured for prod + localhost.

**Soft success (community):** students use the app regularly over a bridge period; parents report clearer visibility into “what was practiced.”

---

## 11. Risks, open decisions, v1.1 follow-ups

### Risks

| Risk | Mitigation / note |
| --- | --- |
| Gemini quota / free-tier model blocks | Document preferred model; degrade AI features |
| Arcade progress lost on device clear / new browser | Accepted for v1; sync is v1.1 candidate |
| Shared device accounts | Link codes + roles; educate families |
| Curriculum drift vs classroom | Unit tags + parent-uploaded worksheets |
| RLS/migration drift across environments | `supabase db push` / repair documented in README |

### Open decisions

- Whether/when to award small daily arcade XP without double-counting mastery.
- Whether arcade progress should sync server-side for parent visibility.
- How widely to invite classmates beyond the initial family cohort.

### Recommended v1.1

1. Persist arcade progress (and optional parent-visible stars) in Supabase.
2. Optional practice XP cap (per day / per mode) per `ARCADE_XP_TODO`.
3. Richer parent digest (email summary of attempts / mastery).
4. Expand question banks / difficulty calibration per unit.
5. Remove leftover Math-only compatibility shims once unused.
6. Stronger COPPA/FERPA-oriented review with school stakeholders if cohort grows.

---

## 12. Appendix — key path map

| Path | Purpose |
| --- | --- |
| `src/routes/` | Landing, auth, dashboard, privacy, admin analytics |
| `src/components/TaskBoard.tsx` / `LessonPractice.tsx` | Lessons & quizzes |
| `src/components/ParentPortal.tsx` | Parent assign + monitor |
| `src/components/BookStudio.tsx` | Assigned reading + reports |
| `src/components/arcade/` | ArcadeHub + DashGame |
| `src/lib/arcade/` | Subject catalogs, levels, local progress, questions |
| `src/lib/curriculum.ts` | Built-in Grade 5 unit lessons |
| `src/lib/task-progress.ts` | Mastery / perfect / attempts / XP eligibility |
| `src/lib/gamification.ts` | Levels, titles, subject accents |
| `src/lib/parent-access.ts` | Adult / portal / admin gates |
| `src/lib/grading.*.ts` / `gemini.server.ts` | AI grading & coach |
| `src/components/howto/` | Tours & shorts |
| `supabase/migrations/` | Schema, RLS, storage, analytics, attempts |
| `netlify.toml` | Build, publish, security headers |
| `README.md` | Setup, env vars, deploy notes |

---

*End of PDR v1 — draft for review. Reflects codebase state as of August 2026, including complete multi-subject Arcades.*
