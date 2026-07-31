import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Mail, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { establishSessionFromUrl } from "@/lib/auth-callback";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { ensureProfileRole } from "@/lib/ensure-role";
import { supabase } from "@/integrations/supabase/client";

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

function AuthConfirmPage() {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [state, setState] = useState<ConfirmState>("working");
  const [message, setMessage] = useState(
    "This confirmation link is invalid or has expired. Request a new one from the sign-in page.",
  );
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const result = await establishSessionFromUrl();

        if (result.error) {
          setMessage(result.error);
          setState("error");
          return;
        }

        if (result.session?.user) {
          try {
            const roleResult = await ensureProfileRole(result.session.user);
            if (roleResult.forcedStudentReason === "under_18") {
              toast.message("Parents must be 18+. Your account was set up as a student.");
            }
            if (roleResult.emailStatus === "sent") {
              toast.success("We emailed your parent/guardian the link code.");
            } else if (
              roleResult.emailStatus === "not_configured" &&
              roleResult.parentContactEmail
            ) {
              toast.message("Email not configured — copy your link code from the dashboard.");
            }
          } catch (err) {
            console.error(err);
          }
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        if (!result.hadAuthParams) {
          setMessage(
            "No confirmation details found. Open the link from your email, or request a new one below.",
          );
          setState("error");
          return;
        }

        // Link worked but no live session yet — guide them to sign in.
        navigate({ to: "/auth/confirmed", replace: true });
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Something went wrong confirming your email.",
        );
        setState("error");
      }
    })();
  }, [navigate]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error("Enter the email you used to sign up.");
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
      toast.success("Check your inbox for a new confirmation link.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend confirmation email.");
    } finally {
      setResending(false);
    }
  }

  if (state === "working") {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="surface-card w-full max-w-md p-6 text-center sm:p-8">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="size-3.5" /> Shia&apos;s 5th Grade Quest
          </p>
          <Loader2 className="mx-auto mt-6 size-8 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-bold">Confirming your email…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hang tight — we&apos;re finishing your signup so you can jump into the quest.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="size-3.5" /> Shia&apos;s 5th Grade Quest
        </p>
        <div className="mt-4 flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h1 className="text-xl font-bold">Link didn&apos;t work</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        <form onSubmit={handleResend} className="mt-6 space-y-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Request a new confirmation link
            <input
              className="input-base mt-1"
              type="email"
              placeholder="Your signup email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={resending}
            className="glow-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {resending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Send new link
          </button>
        </form>

        <Link
          to="/auth"
          className="mt-5 block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
