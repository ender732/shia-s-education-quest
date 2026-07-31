# Shia's Education Quest 

# App Requirement Spec: P.S./I.S. 187 5th-Grade Gamified Prep & AI Grading Platform

Build a full-stack, responsive web application designed as an educational bridge for a student entering 5th Grade at P.S./I.S. 187 Hudson Cliffs (NYC District 6). The application must feature two distinct portals: a gamified Student Portal and a Parent/Admin Dashboard, backed by Supabase for authentication, real-time data, state persistence, and file storage.

---

## 1. Core Architecture & Supabase Setup

### Database Tables (SQL Schema)

Configure Supabase with the following relational tables and Row Level Security (RLS) policies:

1. **`profiles`**

   - `id`: UUID (Primary Key, matches `auth.users.id`)

   - `role`: TEXT ('student' | 'parent')

   - `xp_points`: INTEGER (Default: 0)

   - `level`: INTEGER (Default: 1)

   - `streak_days`: INTEGER (Default: 0)

   - `created_at`: TIMESTAMP

2. **`subjects`**

   - `id`: UUID (Primary Key)

   - `title`: TEXT (e.g., 'Math', 'ELA / Reading', 'Science (NYSSLS)', 'Social Studies (Western Hemisphere)', 'Assigned Reading')

   - `description`: TEXT

3. **`tasks`**

   - `id`: UUID (Primary Key)

   - `subject_id`: UUID (Foreign Key -> `subjects.id`)

   - `title`: TEXT

   - `description`: TEXT

   - `unit_tag`: TEXT (e.g., '187_ELA_UNIT1', '187_MATH_DECIMALS', '187_RACECE_FORMAT')

   - `xp_reward`: INTEGER (Default: 100)

   - `is_completed`: BOOLEAN (Default: false)

   - `created_by`: UUID (Foreign Key -> `profiles.id`)

4. **`assigned_books`**

   - `id`: UUID (Primary Key)

   - `title`: TEXT

   - `author`: TEXT

   - `pdf_url`: TEXT (Supabase Storage bucket link)

   - `assigned_by`: UUID (Foreign Key -> `profiles.id`)

   - `created_at`: TIMESTAMP

5. **`book_reports`**

   - `id`: UUID (Primary Key)

   - `book_id`: UUID (Foreign Key -> `assigned_books.id`)

   - `student_id`: UUID (Foreign Key -> `profiles.id`)

   - `chapter_or_topic`: TEXT

   - `report_text`: TEXT

   - `ai_score`: TEXT (e.g., "92/100")

   - `ai_feedback`: JSONB ({ "strengths": "", "improvements": "", "racece_checklist": {} })

   - `xp_awarded`: INTEGER

   - `submitted_at`: TIMESTAMP

---

## 2. Student Portal Specification (Gamified UI)

### Design & Theme

- **Vibe:** Sleek dark mode with vibrant neon accents (Sky Blue, Amber Gold, Emerald Green, Indigo).

- **Gamification Header:**

  - Dynamic XP Bar, Current Level counter (calculates `Level = Math.floor(XP / 500) + 1`), and a Daily Streak badge with fire icons.

  - Confetti explosion animation whenever a task or report is successfully submitted and XP is awarded.

### Category Navigation & Task Runner

- Allow the student to seamlessly switch between subject tabs:

  1. **Math:** Multi-digit whole numbers, decimals, fractions (unlike denominators), 3D volume ($V = l \times w \times h$).

  2. **ELA:** Narrative analysis, root words, and RACECE-structured writing tasks (Restate, Answer, Cite, Explain, Cite, Explain).

  3. **Science:** NYSSLS 5th-grade topics (Properties of Matter, Conservation of Mass, Earth’s 4 Spheres).

  4. **Social Studies:** Western Hemisphere geography, history, and map reading.

  5. **Book Reader & AI Grader:** Embedded Ebook reader side-by-side with report submission.

### Ebook Reader & AI Agent Evaluation Component

- Split-screen interface:

  - **Left Panel:** PDF Viewer using an HTML iframe or PDF renderer connected to Supabase Storage.

  - **Right Panel:** Interactive Report Submission Form. Fields: "Book Title / Chapter", "Summary & Analysis".

- **AI Grading Pipeline:**

  - Button: "Submit to AI Teacher for Grading".

  - Integrate an Edge Function / API call using OpenAI (`gpt-4o-mini`).

  - **System Prompt Calibration:** Evaluate the student's submission strictly using NYC District 6 / PS 187 5th-grade ELA standards. Assess whether the student used the **RACECE framework** (Restate question, Answer directly, Cite text evidence twice, Explain evidence twice), maintained proper paragraphing, and showed comprehension.

  - Render the AI output in a styled card showing: Overall Grade/100, Strengths, Specific Improvements for Next Time, and an auto-credited XP bonus added directly to the student's profile.

---

## 3. Parent Administration Portal

### Dual Access & Toggle

- Top-right control to switch between Student View and Parent Portal (available when `profiles.role` is `parent` after adult verification at signup).

### Parent Features

1. **Curriculum Task Creator:** Form to publish new custom tasks tied to specific P.S./I.S. 187 units with custom XP values.

2. **Book Upload Manager:** Upload PDF files directly to the `assigned_books` Supabase Storage bucket and assign reading prompts.

3. **Student Progress Monitor:**

   - Real-time dashboard summarizing total XP earned, completion rate per subject, and recent AI-graded book reports.

   - Ability to review full AI feedback and student submissions.

---

## 4. UI/UX & Quality Requirements

- Build using Tailwind CSS, Lucide Icons, and Framer Motion for animations.

- Ensure all components handle loading, empty, and error states gracefully (e.g., loading spinners during AI grading).

- Mobile-responsive and tablet-friendly layout suitable for learning on an iPad or laptop.

## Auth email confirmation (Supabase Dashboard)

After signup, confirmation emails redirect to `/auth/confirm`. Configure these in
[Authentication → URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration):

**Site URL** (production):

```
https://shiadiaz.netlify.app
```

**Redirect URLs** (allow list — add each environment you use):

```
http://localhost:8080/auth/confirm
https://shiadiaz.netlify.app/auth/confirm
https://shiadiaz.netlify.app/**
```

Optional wildcard for preview deploys: `https://*--*.netlify.app/auth/confirm` (or your Netlify pattern).

The app sets `emailRedirectTo` / OAuth `redirectTo` from `window.location.origin`, so localhost and Netlify both work once the allow list matches.

## Google OAuth branding (consent screen)

Google’s “Sign in to …” screen is **not** controlled by this repo’s React UI. It comes from the **Google Cloud OAuth consent / branding** settings for the Client ID stored in Supabase → Authentication → Providers → Google. Because Auth callbacks go through `https://<project-ref>.supabase.co/auth/v1/callback`, Google often shows that host next to “Sign in to …” unless you add a Supabase custom auth domain.

### What you can fix today (free): show **Shia's 5th Grade Quest**

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select the project that owns the OAuth Client ID used in Supabase.
2. Go to **APIs & Services** → **OAuth consent screen** (or **Google Auth Platform** → **Branding**).
3. Set:
   - **App name:** `Shia's 5th Grade Quest`
   - **User support email:** your contact email
   - **App logo:** optional (e.g. the soccer favicon)
   - **Application home page:** `https://shiadiaz.netlify.app`
   - **Privacy policy:** `https://shiadiaz.netlify.app/privacy` (stub route in this app)
   - **Authorized domains:** include `shiadiaz.netlify.app` (and `supabase.co` if Google requires it for the redirect URI)
4. Publishing status: **External** apps in Testing only show branding to test users; publish (and complete brand verification if Google asks) so the app name/logo appear for everyone. Verification can take a few business days.
5. Confirm Supabase → **Authentication** → **Providers** → **Google** uses the **Client ID / secret from this same Google project**.
6. Confirm Supabase → **Authentication** → **URL Configuration** Site URL / Redirect URLs match the section above (Netlify, not the Supabase project URL as Site URL).

**Honest limit:** App name + logo brand the consent experience. They do **not** by themselves replace `wpzvinjoyelbnfcbdrfn.supabase.co` in the “Sign in to …” domain line.

### Optional: replace the `*.supabase.co` domain line (paid)

Per [Supabase Custom Domains](https://supabase.com/docs/guides/platform/custom-domains) and [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google):

1. Project must be on a **paid** Supabase plan; enable the **Custom Domain** add-on (~$10/mo), or use experimental **vanity subdomains** (still paid org; still `*.supabase.co`).
2. Point a subdomain you control (e.g. `api.yourdomain.com`) with a **CNAME** to `wpzvinjoyelbnfcbdrfn.supabase.co`, verify DNS, activate the domain in Dashboard/CLI.
3. In Google Cloud → OAuth client → **Authorized redirect URIs**, add  
   `https://api.yourdomain.com/auth/v1/callback`  
   **in addition to**  
   `https://wpzvinjoyelbnfcbdrfn.supabase.co/auth/v1/callback`.
4. After activation, Auth advertises the custom domain on OAuth; optionally set `VITE_SUPABASE_URL` to the custom domain.

A Netlify-only host (`shiadiaz.netlify.app`) is for the **frontend**. Custom Auth domain needs a DNS name **you** can CNAME to Supabase (usually not the Netlify site hostname itself).

Do not commit Google Client secrets or service-role keys.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
