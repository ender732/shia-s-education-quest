# Security baseline v1

OWASP Top 10 / ASVS-minded baseline for **Shia's 5th Grade Quest** (TanStack Start + Vite + Supabase + Netlify).

**Scope:** auth, sessions, RLS, parent–student linking, server functions, env/secrets, XSS, uploads, admin routes.  
**Out of scope:** arcade anti-cheat depth; accessibility (owned separately).

**Date:** 2026-08-03  
**Companion migration:** `supabase/migrations/20260803151935_security_baseline_v1.sql`

---

## Summary

| Severity | Finding | Status |
|----------|---------|--------|
| High | Lesson-worksheet source PDFs readable by any authenticated user when task published | **Fixed** |
| High | Client-writable `task_progress` / profile XP (integrity) | **Mitigated** (caps + locks); residual accepted |
| Medium | Worksheet `gradeWorksheet` trusted bare client `quizScore` | **Mitigated** (requires prior stored quiz score) |
| Medium | `is_parent` / `is_admin` callable with arbitrary UUIDs (role enumeration) | **Fixed** |
| Medium | Linked parents could DELETE student `task_progress` | **Fixed** (own-delete only) |
| Medium | CSP blocked Google Fonts (incomplete allowlist) | **Fixed** |
| Medium | Link-code email used client-supplied student name | **Fixed** |
| Medium | Unbounded `link_student_by_code` attempts | **Fixed** (soft rate limit) |
| Low | `streak_days` unbounded client increments | **Fixed** |
| Low | Unbounded `xp_awarded` columns | **Fixed** (CHECK ≤ 500) |
| Info | Arcade / client-trusted quiz scores | **Accepted** (see residual) |
| Info | Linked parents can SELECT student `link_code` | **Accepted** (family linking) |
| Info | In-memory coach rate limit (per instance) | **Accepted** |
| Info | Admin UI gate is client-side; RPCs enforce `is_admin` | **Accepted** (defense in depth OK) |

---

## What is already solid

- **Auth:** Supabase Auth; `_authenticated` layout uses `getUser()`; server functions use Bearer JWT + `getClaims` middleware.
- **CSRF:** `createCsrfMiddleware` on server functions (`src/start.ts`).
- **Open redirects:** `sanitizeAppPath` allowlist for auth redirects.
- **Secrets:** `GEMINI_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are non-`VITE_` / server-only; `supabaseAdmin` is lazy and unused by client routes.
- **Roles:** `handle_new_user` forces `student`; DB triggers block client admin assignment and under-18 parent.
- **Parent linking:** No direct INSERT on `parent_student_links`; `link_student_by_code` is SECURITY DEFINER with constant-ish error messages.
- **Books / storage:** Assigned-books bucket private; path prefix `{uid}/`; ownership on parent write/update/delete.
- **Analytics:** Insert via allowlisted RPC; admin read RPCs check `is_admin`; IP stored as truncated hash only.
- **XSS:** No user HTML rendering except chart theme CSS variables (`dangerouslySetInnerHTML` with static theme keys). React escaping elsewhere.
- **Netlify headers:** HSTS, `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP, CSP.

---

## Fixes in this baseline

### 1. Lesson-worksheet PDF RLS (High) — Fixed

**Issue:** Storage SELECT allowed any authenticated user to download published worksheet source PDFs (`EXISTS` on non-draft tasks).  
**Fix:** SELECT limited to uploader folder prefix or admin. Students consume `lesson_payload`, not raw PDFs.

### 2. Role helper enumeration (Medium) — Fixed

**Issue:** `is_parent(uuid)` / `is_admin(uuid)` returned truth for any target UUID.  
**Fix:** Both return true only when `_uid = auth.uid()` (RLS/RPCs already pass the caller).

### 3. Progress delete IDOR-ish (Medium) — Fixed

**Issue:** Linked parents could delete a student’s `task_progress` rows.  
**Fix:** DELETE policy is own-row only; parents retain SELECT for linked students.

### 4. Integrity caps (High→Mitigated)

- Profile `xp_points`: existing +300/update soft cap retained; `streak_days` max +1/update.
- `task_progress.xp_awarded`: cannot change after first non-zero award; CHECK 0–500.
- `worksheet_submissions` / `book_reports` `xp_awarded`: CHECK 0–500.
- `gradeWorksheet` takes `min(clientQuizScore, stored task_progress.score)` so a lone forged worksheet call cannot skip the quiz.

### 5. Parent link attempt rate limit (Medium) — Fixed

Table `parent_link_attempts` (no client grants). Max **10 attempts / parent / 15 minutes** inside `link_student_by_code`.

### 6. Link-code email (Medium) — Fixed

Server prefers `profiles.display_name` over client `studentName`.

### 7. CSP fonts (Medium) — Fixed

Allow `https://fonts.googleapis.com` (style) and `https://fonts.gstatic.com` (font) in Netlify CSP.

---

## Accepted residual risks

| Risk | Why accepted | Follow-up |
|------|----------------|-----------|
| Client-trusted quiz / arcade scores → XP | Product allows browser scoring; soft XP caps exist; deep anti-cheat out of scope | Server-authoritative scoring when needed |
| Worksheet `quizScore` / client-trusted lesson scores | Soft check vs stored `task_progress`; deep anti-cheat out of scope | Server-authoritative scoring when needed |
| Linked parents can read student `link_code` | Enables multi-guardian linking | Column privileges + `get_own_link_code()` RPC if needed |
| Coach / Gemini cost abuse | Per-process in-memory limit (8/min/user) | Redis/Upstash shared limiter |
| JWT not revoked until expiry after user delete | Supabase Auth default | Short JWT TTL; sign-out all sessions on disable |
| `SECURITY DEFINER` RPCs in `public` | Existing pattern; EXECUTE revoked from `anon`/`PUBLIC` | Move helpers to private schema later |
| CSP `script-src 'unsafe-inline'` | Vite/TanStack Start hydration | Nonces/hashes when build pipeline supports |
| Analytics beacon unauthenticated | First-party product analytics; RPC allowlist + rate limit | CAPTCHA if abuse appears |

---

## Ops checklist

### Supabase

1. **Apply migration** (staging then prod):

   ```bash
   supabase db push
   # or link + migrate via Dashboard SQL / CI
   ```

2. **Auth settings (Dashboard → Authentication):**
   - Site URL = production origin only.
   - Redirect URLs allowlist: `https://<prod>/auth/confirm`, `https://<prod>/auth/confirmed`, localhost for dev.
   - Enable email confirmations for password signup.
   - Prefer short access-token expiry for sensitive ops (e.g. 1h).
   - Disable public signup only if invite-only (not current product).

3. **Promote admin** (SQL as postgres / service role — never from client):

   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'operator@example.com');
   ```

4. **Keys:** Rotate if any `service_role` / `sb_secret_*` ever leaked into logs or a client bundle. Publishable/anon key is expected in the browser.

5. **Storage:** Confirm buckets `assigned-books` and `lesson-worksheets` remain **private**, PDF MIME, ~15 MB limit.

6. **Advisors:** After migrate, run Database → Advisors (or `supabase db advisors`) and clear new RLS/security warnings.

### Netlify

1. **Env (Site settings → Environment variables):**

   | Variable | Scope | Notes |
   |----------|--------|--------|
   | `VITE_SUPABASE_URL` | Build + Runtime | Public |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Build + Runtime | Public |
   | `SUPABASE_SERVICE_ROLE_KEY` | Runtime (Functions) | **Never** `VITE_` |
   | `GEMINI_API_KEY` | Runtime | **Never** omit from secrets scan |
   | `RESEND_API_KEY` | Runtime | Same |
   | `EMAIL_FROM` / `RESEND_FROM` | Runtime | Optional; in omit list |

2. Confirm `SECRETS_SCAN_OMIT_KEYS` in `netlify.toml` does **not** include `GEMINI_API_KEY`, `RESEND_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`.

3. Deploy so `[[headers]]` CSP/HSTS from `netlify.toml` apply; verify with browser DevTools → Network → Response Headers on `/`.

4. Force HTTPS (Netlify default); HSTS preload only after domain is HTTPS-stable.

### Local / CI

- Keep `.env` out of git; use `.env.example` as the template.
- Never commit service role or Gemini/Resend keys.
- After pulling, run the new migration against local Supabase before QA.

---

## Verification smoke tests

1. Student A cannot download Parent B’s `lesson-worksheets/{parentId}/*.pdf` via Storage API.
2. `rpc('is_admin', { _uid: otherUserId })` returns false for non-self.
3. Parent cannot `.delete()` another student’s `task_progress`.
4. Parent gets rate-limit error after >10 bad link codes in 15 minutes.
5. Profile update with `xp_points += 301` fails; `streak_days += 2` fails.
6. `/admin/analytics` as non-admin redirects/fails; RPCs raise `not authorized`.
7. Server functions without Bearer / CSRF fail.
8. Response headers include CSP with fonts.googleapis.com / fonts.gstatic.com.

---

## Mapping (quick)

| OWASP Top 10 | Coverage in this app |
|--------------|----------------------|
| A01 Broken Access Control | RLS, link RPC, storage paths, admin RPCs, progress delete fix |
| A02 Cryptographic Failures | TLS (Netlify/Supabase); no passwords at rest in app DB |
| A03 Injection | Zod on server fns; parameterized Supabase client |
| A04 Insecure Design | Age-gated parent role; no metadata-trust for role |
| A05 Security Misconfiguration | Netlify headers; private buckets; secret env hygiene |
| A06 Vulnerable Components | Keep deps updated (ops) |
| A07 Auth Failures | Supabase Auth + CSRF + redirect allowlist |
| A08 Data Integrity | Soft XP/streak/xp_awarded guards |
| A09 Logging/Monitoring | Prefer Supabase/Netlify logs; avoid logging tokens |
| A10 SSRF | No user-controlled server fetch URLs in app code |
