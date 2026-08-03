import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Mail, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { establishSessionFromUrl } from "@/lib/auth-callback";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { ensureProfileRole } from "@/lib/ensure-role";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/auth/confirm")({
  head: () => ({
    meta: [
      { title: "Confirming email — Shia's 5th Grade Quest" },
      {
        name: "description",
        content: "Finishing email confirmation for Shia's 5th Grade Quest.",
      },
    ],
  }),
  component: AuthConfirmPage,
});

type ConfirmState = "working" | "error";

/** Either a catalog key we own, or a message handed to us by Supabase. */
type ConfirmMessage = { key: string } | { text: string };

function AuthConfirmPage() {
  const navigate = useNavigate();
  const ran = useRef(false);
  const { t, tError } = useTranslation();
  const [state, setState] = useState<ConfirmState>("working");
  const [message, setMessage] = useState<ConfirmMessage>({ key: "auth.confirm.invalidLink" });
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const result = await establishSessionFromUrl();

        if (result.error) {
          setMessage({ text: result.error });
          setState("error");
          return;
        }

        if (result.session?.user) {
          try {
            const roleResult = await ensureProfileRole(result.session.user);
            const providers = result.session.user.app_metadata?.provider;
            const isGoogle =
              providers === "google" ||
              (Array.isArray(result.session.user.app_metadata?.providers) &&
                result.session.user.app_metadata.providers.includes("google"));
            void trackEvent(isGoogle ? "oauth_return" : "confirm_email", {
              provider: isGoogle ? "google" : "email",
            });
            if (roleResult.forcedStudentReason === "under_18") {
              toast.message(t("auth.toast.forcedStudent"));
            } else if (roleResult.forcedStudentReason === "missing_confirmation") {
              toast.message(t("auth.toast.parentConfirmationIncomplete"));
            }
            if (roleResult.role === "parent") {
              toast.success(t("auth.toast.parentReady"));
            }
            if (roleResult.emailStatus === "sent") {
              toast.success(t("auth.toast.linkCodeEmailed"));
            } else if (
              roleResult.emailStatus === "not_configured" &&
              roleResult.parentContactEmail
            ) {
              toast.message(t("auth.toast.emailNotConfiguredDashboard"));
            }
          } catch (err) {
            console.error(err);
            toast.error(tError(err, "auth.toast.roleSetupFailed"));
          }
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        if (!result.hadAuthParams) {
          setMessage({ key: "auth.confirm.noParams" });
          setState("error");
          return;
        }

        // Link worked but no live session yet — guide them to sign in.
        navigate({ to: "/auth/confirmed", replace: true });
      } catch (err) {
        setMessage(
          err instanceof Error && err.message
            ? { text: err.message }
            : { key: "auth.confirm.genericFailure" },
        );
        setState("error");
      }
    })();
  }, [navigate, t, tError]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error(t("auth.confirm.resendMissingEmail"));
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: resendEmail.trim(),
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
      toast.success(t("auth.confirm.resendSent"));
    } catch (err) {
      toast.error(tError(err, "auth.confirm.resendFailed"));
    } finally {
      setResending(false);
    }
  }

  if (state === "working") {
    return (
      <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="surface-card w-full max-w-md p-6 text-center sm:p-8">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="size-3.5" aria-hidden /> {t("app.name")}
          </p>
          <Loader2 className="mx-auto mt-6 size-8 animate-spin text-primary" aria-hidden />
          <h1 className="mt-4 text-xl font-bold">{t("auth.confirm.workingTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground" role="status" aria-live="polite">
            {t("auth.confirm.workingBody")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="size-3.5" aria-hidden /> {t("app.name")}
        </p>
        <div className="mt-4 flex items-start gap-3" role="alert">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <h1 className="text-xl font-bold">{t("auth.confirm.errorTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {"key" in message ? t(message.key) : message.text}
            </p>
          </div>
        </div>

        <form onSubmit={handleResend} className="mt-6 space-y-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("auth.confirm.resendLabel")}
            <input
              className="input-base mt-1"
              type="email"
              placeholder={t("auth.confirm.resendPlaceholder")}
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <button
            type="submit"
            disabled={resending}
            className="glow-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {resending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Mail className="size-4" aria-hidden />
            )}
            {t("auth.confirm.resendSubmit")}
          </button>
        </form>

        <Link
          to="/auth"
          className="mt-5 block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("auth.confirm.backToSignIn")}
        </Link>
      </div>
    </main>
  );
}
