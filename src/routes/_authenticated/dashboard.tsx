import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LogOut, ShieldCheck, Loader2, GraduationCap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookStudio } from "@/components/BookStudio";
import { GamificationHeader } from "@/components/GamificationHeader";
import { ParentLinkCodeCard } from "@/components/ParentLinkCodeCard";
import { ParentPortal } from "@/components/ParentPortal";
import { SubjectTabs } from "@/components/SubjectTabs";
import { TaskBoard, useTasks } from "@/components/TaskBoard";
import { useProfile, useSession, useStreakTouch } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { accentFor } from "@/lib/gamification";
import { canAccessParentPortal } from "@/lib/parent-access";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Quest Dashboard — Shia's 5th Grade Quest" },
      {
        name: "description",
        content:
          "Learn Math, ELA, Science and Social Studies with practice questions, then submit AI-graded book reports.",
      },
      { property: "og:title", content: "My Quest Dashboard — Shia's 5th Grade Quest" },
      {
        property: "og:description",
        content: "Interactive 5th-grade lessons with quizzes and RACECE writing feedback.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  useStreakTouch(profile);

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, title, description, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useTasks();

  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [parentMode, setParentMode] = useState(false);

  const current = useMemo(
    () => subjects?.find((s) => s.id === activeSubject) ?? subjects?.[0] ?? null,
    [subjects, activeSubject],
  );

  const subjectTasks = useMemo(
    () => (tasks ?? []).filter((t) => t.subject_id === current?.id),
    [tasks, current],
  );

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function requestParentMode() {
    if (canAccessParentPortal(profile?.role)) {
      setParentMode(true);
      return;
    }
    toast.error(
      "Parent Portal is only available on parent accounts. Create a parent/guardian account with adult verification (18+) at signup — students share a link code to connect.",
    );
  }

  if (profileLoading || subjectsLoading || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading your quest…
      </div>
    );
  }

  const isReading = current?.title === "Assigned Reading";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold">
          {parentMode ? (
            <ShieldCheck className="size-3.5 text-accent" />
          ) : (
            <GraduationCap className="size-3.5 text-primary" />
          )}
          {parentMode ? "Parent Portal" : "Student Portal"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (parentMode ? setParentMode(false) : requestParentMode())}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
          >
            {parentMode ? "Switch to Student View" : "Switch to Parent Portal"}
          </button>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-destructive"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>

      {parentMode ? (
        <ParentPortal userId={userId} subjects={subjects ?? []} />
      ) : (
        <div className="space-y-5">
          <GamificationHeader
            name={profile?.display_name ?? "Explorer"}
            xp={profile?.xp_points ?? 0}
            streak={profile?.streak_days ?? 0}
          />

          {(profile?.role ?? "student") === "student" && (
            <ParentLinkCodeCard
              linkCode={profile?.link_code}
              parentContactEmail={profile?.parent_contact_email}
              studentName={profile?.display_name}
            />
          )}

          <SubjectTabs
            subjects={subjects ?? []}
            activeId={current?.id}
            onSelect={setActiveSubject}
          />

          {current?.description && (
            <p className="text-sm text-muted-foreground">{current.description}</p>
          )}

          <motion.div key={current?.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {isReading ? (
              <BookStudio userId={userId} />
            ) : (
              <TaskBoard
                tasks={subjectTasks}
                loading={tasksLoading}
                error={tasksError}
                accent={accentFor(current?.title ?? "")}
                userId={userId}
              />
            )}
          </motion.div>
        </div>
      )}
    </main>
  );
}
