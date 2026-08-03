import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { clearAuthIntent, saveAuthIntent, type AuthSignupIntent } from "@/lib/auth-intent";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { ensureProfileRole } from "@/lib/ensure-role";
import { trackEvent } from "@/lib/analytics";
import { ageFromDob, isAdultDob } from "@/lib/parent-access";
import { useSession } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/i18n";

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
  const { t, tError } = useTranslation();
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
          toast.message(t("auth.toast.forcedStudent"));
        }
        if (result.emailStatus === "sent") {
          toast.success(t("auth.toast.linkCodeEmailed"));
        } else if (result.emailStatus === "not_configured" && result.parentContactEmail) {
          toast.message(t("auth.toast.emailNotConfiguredShare"));
        }
      } catch (err) {
        console.error(err);
      } finally {
        navigate({ to: "/dashboard", replace: true });
      }
    })();
  }, [session, navigate, t]);

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

  /** Returns a message-catalog key for the first problem found, else null. */
  function validateSignup(): string | null {
    if (path === "student") {
      if (!parentContactEmail.trim()) return "auth.validation.parentEmailRequired";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentContactEmail.trim())) {
        return "auth.validation.parentEmailInvalid";
      }
      return null;
    }
    if (!dateOfBirth) return "auth.validation.dobRequired";
    const age = ageFromDob(dateOfBirth);
    if (age === null) return "auth.validation.dobInvalid";
    if (!isAdultDob(dateOfBirth)) return "auth.validation.mustBeAdult";
    if (!confirmAdult) return "auth.validation.confirmAdult";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const validationErrorKey = validateSignup();
        if (validationErrorKey) {
          toast.error(t(validationErrorKey));
          return;
        }

        const intent = buildIntent();
        saveAuthIntent(intent);
        void trackEvent("signup_start", { path });

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
          toast.message(t("auth.toast.confirmThenSignIn"));
        } else if (data.user) {
          roleApplied.current = true;
          const result = await ensureProfileRole(data.user, intent);
          if (result.forcedStudentReason === "under_18") {
            toast.message(t("auth.toast.forcedStudent"));
          }
          if (result.emailStatus === "sent") {
            toast.success(t("auth.toast.linkCodeEmailed"));
          } else if (result.emailStatus === "not_configured") {
            toast.message(t("auth.toast.emailNotConfiguredDashboard"));
          }
          navigate({ to: "/dashboard", replace: true });
        }
      } else {
        clearAuthIntent();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void trackEvent("login", { method: "password" });
      }
    } catch (err) {
      toast.error(tError(err, "common.somethingWentWrong"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (mode === "signup") {
      const validationErrorKey = validateSignup();
      if (validationErrorKey) {
        toast.error(t(validationErrorKey));
        return;
      }
      // Persist role + DOB before leaving for Google so /auth/confirm can apply them.
      saveAuthIntent(buildIntent());
      void trackEvent("signup_start", { path, method: "google" });
    } else {
      clearAuthIntent();
      void trackEvent("login", { method: "google" });
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthRedirectUrl() },
    });
    if (error) {
      setBusy(false);
      toast.error(t("auth.toast.googleFailed"));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="size-3.5" /> {t("app.name")}
          </p>
          <LanguageSwitcher />
        </div>
        <h1 className="mt-2 text-2xl font-bold">
          {mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>

        {checkEmail ? (
          <div className="mt-6 rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            {t("auth.checkEmailNotice")}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {mode === "signup" && (
                <>
                  <input
                    className="input-base"
                    placeholder={t("auth.displayNamePlaceholder")}
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
                      {t("auth.pathStudent")}
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
                      {t("auth.pathParent")}
                    </button>
                  </div>

                  {path === "student" ? (
                    <>
                      <input
                        className="input-base"
                        type="email"
                        placeholder={t("auth.parentEmailPlaceholder")}
                        value={parentContactEmail}
                        onChange={(e) => setParentContactEmail(e.target.value)}
                        required
                      />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {t("auth.studentPathNote")}
                      </p>
                    </>
                  ) : (
                    <>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("auth.dateOfBirthLabel")}
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
                        <span>{t("auth.confirmAdultLabel")}</span>
                      </label>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {t("auth.parentPathNote")}
                      </p>
                    </>
                  )}
                </>
              )}
              <input
                className="input-base"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="input-base"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
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
                {mode === "signin" ? t("auth.submitSignIn") : t("auth.submitSignUp")}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> {t("common.or")}{" "}
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
                  ? t("auth.googleSignUpParent")
                  : t("auth.googleSignUpStudent")
                : t("auth.googleSignIn")}
            </button>
            {mode === "signup" && path === "parent" && (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                {t("auth.googleParentNote")}
              </p>
            )}
            {mode === "signin" && (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                {t("auth.needParentAccountNote")}
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
              {mode === "signin" ? t("auth.toggleToSignUp") : t("auth.toggleToSignIn")}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
