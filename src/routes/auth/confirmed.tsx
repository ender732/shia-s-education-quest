import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Rocket, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useSession } from "@/hooks/useProfile";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/auth/confirmed")({
  head: () => ({
    meta: [
      { title: "Email confirmed — Shia's 5th Grade Quest" },
      {
        name: "description",
        content: "Your email is confirmed. Sign in to continue Shia's 5th Grade Quest.",
      },
    ],
  }),
  component: AuthConfirmedPage,
});

function AuthConfirmedPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, navigate]);

  if (loading || session) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="surface-card w-full max-w-md p-6 text-center sm:p-8">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{t("auth.confirmed.redirecting")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="size-3.5" /> {t("app.name")}
        </p>
        <div className="mt-4 flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" />
          <div>
            <h1 className="text-2xl font-bold">{t("auth.confirmed.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("auth.confirmed.body")}</p>
          </div>
        </div>

        <Link
          to="/auth"
          className="glow-ring mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
        >
          <Rocket className="size-4" /> {t("auth.confirmed.cta")}
        </Link>

        <Link
          to="/"
          className="mt-4 block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("common.backHome")}
        </Link>
      </div>
    </main>
  );
}
