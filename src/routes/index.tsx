import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Flame, Rocket, Sparkles, Trophy } from "lucide-react";
import { useEffect } from "react";
import { useSession } from "@/hooks/useProfile";

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

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-5 py-16 text-center">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
        <Sparkles className="size-3.5" /> NYC District 6 · Grade 5
      </p>
      <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">
        Shia's 5th Grade <span className="text-primary">Quest</span>
      </h1>
      <p className="mt-4 max-w-xl text-base text-muted-foreground">
        A gamified summer bridge for P.S./I.S. 187. Master Math, ELA, Science and Social Studies,
        read assigned ebooks, and get instant AI feedback on RACECE writing.
      </p>

      <Link
        to="/auth"
        className="glow-ring mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
      >
        <Rocket className="size-4" /> Start the quest
      </Link>

      <div className="mt-14 grid w-full gap-4 sm:grid-cols-3">
        <Card icon={<Trophy className="size-5 text-xp" />} title="Earn XP & level up">
          Every completed task adds XP. 500 XP per level, with confetti on every win.
        </Card>
        <Card icon={<Flame className="size-5 text-streak" />} title="Keep the streak">
          Daily practice builds a fire streak that shows up right in the header.
        </Card>
        <Card icon={<BookOpen className="size-5 text-reading" />} title="AI Teacher grading">
          Submit a book report and get a score, strengths, and a RACECE checklist.
        </Card>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        <Link to="/privacy" className="underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
      </p>
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
    <div className="surface-card p-5 text-left">
      {icon}
      <h2 className="mt-3 text-sm font-bold">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
