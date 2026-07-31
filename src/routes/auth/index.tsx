import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { clearAuthIntent, saveAuthIntent, type AuthSignupIntent } from "@/lib/auth-intent";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { ensureProfileRole } from "@/lib/ensure-role";
import { ageFromDob, isAdultDob } from "@/lib/parent-access";
import { useSession } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in — Shia's 5th Grade Quest" },
      {
        name: "description",
        content:
          "Sign in to Shia's 5th Grade Quest to track XP, complete P.S./I.S. 187 assignments, and submit AI-graded book reports.",
      },
      { property: "og:title", content: "Sign in — Shia's 5th Grade Quest" },
      {
        property: "og:description",
        content: "Student and parent access for the P.S./I.S. 187 5th-grade prep platform.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [path, setPath] = useState<"student" | "parent">("student");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [parentContactEmail, setParentContactEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const roleApplied = useRef(false);

  useEffect(() => {
    if (!session?.user || roleApplied.current) return;
    roleApplied.current = true;

    (async () => {
      try {
        const result = await ensureProfileRole(session.user);
        if (result.forcedStudentReason === "under_18") {
          toast.message("Parents must be 18+. Your account was set up as a student.");
        }
        if (result.emailStatus === "sent") {
          toast.success("We emailed your parent/guardian the link code.");
        } else if (result.emailStatus === "not_configured" && result.parentContactEmail) {
          toast.message("Email not configured — copy your link code from the dashboard to share.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        navigate({ to: "/dashboard", replace: true });
      }
    })();
  }, [session, navigate]);

  function buildIntent(): AuthSignupIntent {
    return {
      path,
      displayName: displayName.trim() || undefined,
      ...(path === "student"
        ? { parentContactEmail: parentContactEmail.trim() }
        : {
            dateOfBirth,
            confirmedParentGuardian: confirmAdult,
          }),
    };
  }

  function validateSignup(): string | null {
    if (path === "student") {
      if (!parentContactEmail.trim())
        return "Parent/guardian email is required for student accounts.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentContactEmail.trim())) {
        return "Enter a valid parent/guardian email.";
      }
      return null;
    }
    if (!dateOfBirth) return "Date of birth is required for parent accounts.";
    const age = ageFromDob(dateOfBirth);
    if (age === null) return "Enter a valid date of birth.";
    if (!isAdultDob(dateOfBirth)) {
      return "Parents must be 18 or older. Choose the student path if you are under 18.";
    }
    if (!confirmAdult) return "Confirm that you are a parent/guardian 18+.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const validationError = validateSignup();
        if (validationError) {
          toast.error(validationError);
          return;
        }

        const intent = buildIntent();
        saveAuthIntent(intent);

        const role =
          path === "parent" && isAdultDob(dateOfBirth) && confirmAdult ? "parent" : "student";

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: {
              display_name: displayName || email.split("@")[0],
              role,
              ...(path === "student"
                ? { parent_contact_email: parentContactEmail.trim().toLowerCase() }
                : {}),
            },
          },
        });
        if (error) throw error;

        if (!data.session) {
          setCheckEmail(true);
          toast.message("Confirm your email, then sign in to finish setup.");
        } else if (data.user) {
          roleApplied.current = true;
          const result = await ensureProfileRole(data.user, intent);
          if (result.forcedStudentReason === "under_18") {
            toast.message("Parents must be 18+. Your account was set up as a student.");
          }
          if (result.emailStatus === "sent") {
            toast.success("We emailed your parent/guardian the link code.");
          } else if (result.emailStatus === "not_configured") {
            toast.message("Email not configured — copy your link code from the dashboard.");
          }
          navigate({ to: "/dashboard", replace: true });
        }
      } else {
        clearAuthIntent();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (mode === "signup") {
      const validationError = validateSignup();
      if (validationError) {
        toast.error(validationError);
        return;
      }
      // Persist role + DOB before leaving for Google so /auth/confirm can apply them.
      saveAuthIntent(buildIntent());
    } else {
      clearAuthIntent();
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthRedirectUrl() },
    });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="size-3.5" /> Shia's 5th Grade Quest
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          P.S./I.S. 187 5th-grade prep for students and parents.
        </p>

        {checkEmail ? (
          <div className="mt-6 rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            Check your email and tap the confirmation link. You&apos;ll land back here on a
            &ldquo;Email confirmed&rdquo; page, then you can sign in. If you signed up as a student,
            we&apos;ll finish sending your parent the link code after you confirm.
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {mode === "signup" && (
                <>
                  <input
                    className="input-base"
                    placeholder="Display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPath("student");
                        setConfirmAdult(false);
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        path === "student"
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setPath("parent")}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        path === "parent"
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      I am a parent/guardian
                    </button>
                  </div>

                  {path === "student" ? (
                    <>
                      <input
                        className="input-base"
                        type="email"
                        placeholder="Parent/guardian email"
                        value={parentContactEmail}
                        onChange={(e) => setParentContactEmail(e.target.value)}
                        required
                      />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        We&apos;ll email them your parent link code so they can connect in Parent
                        Portal. Under-13 learners should use a parent-managed setup when possible.
                      </p>
                    </>
                  ) : (
                    <>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Date of birth
                        <input
                          className="input-base mt-1"
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          required
                          max={new Date().toISOString().slice(0, 10)}
                        />
                      </label>
                      <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={confirmAdult}
                          onChange={(e) => setConfirmAdult(e.target.checked)}
                        />
                        <span>I confirm I am a parent/guardian 18 years of age or older.</span>
                      </label>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Parent accounts require adult verification. You&apos;ll link a child with
                        their shareable link code after signup.
                      </p>
                    </>
                  )}
                </>
              )}
              <input
                className="input-base"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="input-base"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="glow-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or{" "}
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
            >
              {mode === "signup"
                ? path === "parent"
                  ? "Continue with Google as parent"
                  : "Continue with Google as student"
                : "Sign in with Google"}
            </button>
            {mode === "signup" && path === "parent" && (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                Adult verification (date of birth + confirmation above) is required before Google
                continues — same as email signup.
              </p>
            )}
            {mode === "signin" && (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                Need a parent account? Choose &ldquo;Create an account&rdquo; and select
                parent/guardian so we can verify you&apos;re 18+ (works with Google too).
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setCheckEmail(false);
              }}
              className="mt-5 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
