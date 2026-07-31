# Shia's 5th Grade Quest

Gamified learning app for 5th graders at P.S./I.S. 187 Hudson Cliffs (NYC District 6), with a student portal and a parent portal.

## What it is

Students practice Math, ELA, Science, and Social Studies through lessons and quizzes, earn XP/levels/streaks, climb a daily leaderboard, and submit book reports for AI feedback (RACECE writing). Parents link to a child via a shareable link code, upload assigned PDF books, create tasks, and review progress.

Auth supports email/password (with confirmation) and Google OAuth. Parent access requires adult age verification at signup or upgrade.

**Production:** [https://shiadiaz.netlify.app](https://shiadiaz.netlify.app)

## Tech stack

| Layer | Choice |
| --- | --- |
| App | [TanStack Start](https://tanstack.com/start) + React 19 + Vite 8 |
| UI | Tailwind CSS 4, Radix/shadcn-style components, Framer Motion, Lucide |
| Data / Auth | Supabase (Auth, Postgres, Storage, RLS) |
| Hosting | Netlify (`@netlify/vite-plugin-tanstack-start`) |
| Optional | Resend (parent link emails), OpenAI (book-report grading) |

## Features

- **Student dashboard** — subjects, lessons/quizzes, XP bar, streaks, daily leaderboard
- **Parent portal** — link students by code, create tasks, upload PDFs, monitor progress
- **Book studio** — assigned reading + AI-graded reports (when `OPENAI_API_KEY` is set)
- **Auth** — email confirm → `/auth/confirm`; Google sign-in; parent vs student roles
- **Parent link codes** — students share a UUID; optional email via Resend

## Prerequisites

- **Node.js** 20+ (repo developed on Node 26; use a current LTS if unsure)
- A **Supabase** project
- **Netlify** account (for deploy)
- Optional: Resend + OpenAI API keys

## Local setup

```sh
git clone https://github.com/ender732/shia-s-education-quest.git
cd shia-s-education-quest
cp .env.example .env   # fill in values — never commit secrets
npm install
npm run dev            # http://localhost:8080
```

Install and link the [Supabase CLI](https://supabase.com/docs/guides/cli), then push migrations to your project (see Database below).

## Environment variables

Copy `.env.example`. Client vars need the `VITE_` prefix for the browser; server code also reads non-`VITE_` names.

| Variable | Required | Where | Purpose |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Client | Anon / publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Recommended | Client | Project ref (tooling / Netlify) |
| `SUPABASE_URL` | Yes (server) | Server | Same URL for SSR / middleware |
| `SUPABASE_PUBLISHABLE_KEY` | Yes (server) | Server | Same publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server | Privileged admin ops only |
| `RESEND_API_KEY` | No | Server | Email parent link codes |
| `EMAIL_FROM` / `RESEND_FROM` | No | Server | From address for Resend |
| `OPENAI_API_KEY` | No | Server | AI book-report grading |
| `AI_MODEL` | No | Server | Defaults to `gpt-4o-mini` |
| `AI_GATEWAY_URL` | No | Server | Defaults to OpenAI chat completions URL |

On Netlify, set the same keys in **Site settings → Environment variables**. Do not put service-role keys in `VITE_*` vars.

## Database

SQL migrations live in `supabase/migrations/`. Apply them with the CLI:

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

If the remote migration history was empty or out of sync with files already applied by hand, use `supabase migration repair` once, then `db push` again. See [Supabase CLI migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations).

Schema highlights: profiles (roles, XP, link codes), subjects/tasks, parent–student links, daily leaderboard RPC, assigned books + reports.

## Auth notes

Keep this short — details live in vendor docs.

1. **Email confirm** redirects to `/auth/confirm`. In Supabase → [URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration):
   - **Site URL:** `https://shiadiaz.netlify.app` (production)
   - **Redirect URLs:** `http://localhost:8080/auth/confirm`, `https://shiadiaz.netlify.app/auth/confirm` (plus Netlify preview patterns if needed)
2. **Google OAuth:** enable the Google provider in Supabase Auth. Set the consent screen **App name** (e.g. `Shia's 5th Grade Quest`) in [Google Cloud](https://console.cloud.google.com/) → OAuth consent / Branding. Authorized redirect URI is Supabase’s callback (`https://<project-ref>.supabase.co/auth/v1/callback`). Guide: [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google).
3. The app builds `redirectTo` from `window.location.origin`, so localhost and production both work once allow-listed.

## Storage

- Private bucket: **`assigned-books`**
- PDF uploads only; parents upload, linked students read via signed access (see `secure_assigned_books_storage` migration)
- Bucket is created/secured by migrations — run `supabase db push` before testing uploads

## Deploy (Netlify)

- Build command: `npm run build`
- Publish directory: **`dist/client`**
- Adapter: `@netlify/vite-plugin-tanstack-start` (configured in `vite.config.ts`)

`netlify.toml` already sets build/publish. If the Netlify UI has a conflicting Publish directory, clear it or set it to `dist/client`. Secrets scanning omits the public Supabase keys listed there so deploys are not blocked by expected client env inlining.

## Project structure

```
src/
  routes/          # TanStack Router file routes (auth, dashboard, privacy)
  components/      # Student/parent UI, lessons, books, leaderboard
  lib/             # Server functions, grading, email, gamification
  hooks/           # Profile/session helpers
  integrations/    # Supabase clients + types
supabase/
  migrations/      # Postgres schema, RLS, storage policies
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on port **8080** |
| `npm run build` | Production build |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
