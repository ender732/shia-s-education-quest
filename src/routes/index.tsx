import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Flame, Rocket, Sparkles, Trophy } from "lucide-react";
import { useEffect } from "react";
import { useSession } from "@/hooks/useProfile";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shia's 5th Grade Quest — 5th Grade Prep for P.S./I.S. 187" },
      {
        name: "description",
        content:
          "A gamified 5th-grade prep platform for P.S./I.S. 187 Hudson Cliffs: Math, ELA, Science, Social Studies, and AI-graded RACECE book reports.",
      },
      { property: "og:title", content: "Shia's 5th Grade Quest — 5th Grade Prep for P.S./I.S. 187" },
      {
        property: "og:description",
        content:
          "Earn XP, keep your streak, and get instant AI feedback on RACECE book reports built for NYC District 6 standards.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-5 py-16 text-center">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
        <Sparkles className="size-3.5" /> {t("landing.eyebrow")}
      </p>
      <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">
        {t("landing.titleLead")} <span className="text-primary">{t("landing.titleAccent")}</span>
      </h1>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">{t("landing.body")}</p>

      <Link
        to="/auth"
        className="glow-ring mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
      >
        <Rocket className="size-4" /> {t("landing.cta")}
      </Link>

      <div className="mt-14 grid w-full gap-4 sm:grid-cols-3">
        <Card icon={<Trophy className="size-5 text-xp" />} title={t("landing.cards.xp.title")}>
          {t("landing.cards.xp.body")}
        </Card>
        <Card
          icon={<Flame className="size-5 text-streak" />}
          title={t("landing.cards.streak.title")}
        >
          {t("landing.cards.streak.body")}
        </Card>
        <Card
          icon={<BookOpen className="size-5 text-reading" />}
          title={t("landing.cards.grading.title")}
        >
          {t("landing.cards.grading.body")}
        </Card>
      </div>

      {/* Legal / Netlify credit live in the site-wide SiteFooter */}
    </main>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card p-5 text-start">
      {icon}
      <h2 className="mt-3 text-sm font-bold">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
