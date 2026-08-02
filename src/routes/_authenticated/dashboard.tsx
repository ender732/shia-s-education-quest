import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LogOut, ShieldCheck, Loader2, GraduationCap, BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookStudio } from "@/components/BookStudio";
import { DailyLeaderboard } from "@/components/DailyLeaderboard";
import { GamificationHeader } from "@/components/GamificationHeader";
import { HowToContextual } from "@/components/howto/HowToContextual";
import { HowToHelpMenu } from "@/components/howto/HowToHelpMenu";
import { HowToTour } from "@/components/howto/HowToTour";
import { ArcadeHub } from "@/components/arcade/ArcadeHub";
import { ParentLinkCodeCard } from "@/components/ParentLinkCodeCard";
import { arcadeForSubjectTitle } from "@/lib/arcade/index";
import { ParentPortal } from "@/components/ParentPortal";
import { SubjectTabs } from "@/components/SubjectTabs";
import { TaskBoard, useTasks } from "@/components/TaskBoard";
import { useProfile, useSession, useStreakTouch } from "@/hooks/useProfile";
import { upgradeStudentToParent } from "@/lib/ensure-role";
import { supabase } from "@/integrations/supabase/client";
import { accentFor } from "@/lib/gamification";
import { ageFromDob, canAccessAdmin, canAccessParentPortal, isAdultDob } from "@/lib/parent-access";

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
  const queryClient = useQueryClient();
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
  const [showParentUpgrade, setShowParentUpgrade] = useState(false);
  const [upgradeDob, setUpgradeDob] = useState("");
  const [upgradeConfirm, setUpgradeConfirm] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [forceTour, setForceTour] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  const current = useMemo(
    () => subjects?.find((s) => s.id === activeSubject) ?? subjects?.[0] ?? null,
    [subjects, activeSubject],
  );

  const subjectTasks = useMemo(
    () => (tasks ?? []).filter((t) => t.subject_id === current?.id),
    [tasks, current],
  );

  const isParent = canAccessParentPortal(profile?.role);
  const isAdmin = canAccessAdmin(profile?.role);
  const howtoRole: "student" | "parent" =
    parentMode && isParent ? "parent" : "student";
  const tourBlocksContextual = tourActive || forceTour;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function submitParentUpgrade(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return;

    if (!upgradeDob) {
      toast.error("Enter your date of birth.");
      return;
    }
    if (ageFromDob(upgradeDob) === null) {
      toast.error("Enter a valid date of birth.");
      return;
    }
    if (!isAdultDob(upgradeDob)) {
      toast.error("Parents must be 18 or older.");
      return;
    }
    if (!upgradeConfirm) {
      toast.error("Confirm that you are a parent/guardian 18+.");
      return;
    }

    setUpgradeBusy(true);
    try {
      const result = await upgradeStudentToParent(session.user, {
        dateOfBirth: upgradeDob,
        confirmedParentGuardian: upgradeConfirm,
      });
      if (!result.ok) {
        if (result.reason === "under_18") toast.error("Parents must be 18 or older.");
        else if (result.reason === "missing_confirmation")
          toast.error("Confirm that you are a parent/guardian 18+.");
        else toast.error(typeof result.reason === "string" ? result.reason : "Could not upgrade.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setShowParentUpgrade(false);
      setParentMode(true);
      toast.success("You're verified as a parent — Parent Portal is unlocked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upgrade account.");
    } finally {
      setUpgradeBusy(false);
    }
  }

  if (profileLoading || subjectsLoading || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading your quest…
      </div>
    );
  }

  const isReading = current?.title === "Assigned Reading";
  const subjectArcade = arcadeForSubjectTitle(current?.title);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold">
          {parentMode && isParent ? (
            <ShieldCheck className="size-3.5 text-accent" />
          ) : (
            <GraduationCap className="size-3.5 text-primary" />
          )}
          {parentMode && isParent ? "Parent Portal" : "Student Portal"}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {userId && (
            <HowToHelpMenu
              userId={userId}
              role={howtoRole}
              onReplayTour={() => setForceTour(true)}
            />
          )}
          {isAdmin && (
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
            >
              <BarChart3 className="size-3.5 text-primary" /> Analytics
            </Link>
          )}
          {isParent ? (
            <button
              onClick={() => setParentMode((v) => !v)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
            >
              {parentMode ? "Switch to Student View" : "Switch to Parent Portal"}
            </button>
          ) : !isAdmin ? (
            <button
              onClick={() => setShowParentUpgrade((v) => !v)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
            >
              {showParentUpgrade ? "Hide parent upgrade" : "I meant to be a parent"}
            </button>
          ) : null}
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-destructive"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>

      {userId && (
        <HowToTour
          userId={userId}
          role={howtoRole}
          forceRun={forceTour}
          onForceHandled={() => setForceTour(false)}
          onTourActiveChange={setTourActive}
        />
      )}

      {!isParent && showParentUpgrade && (
        <form
          onSubmit={submitParentUpgrade}
          className="mb-5 space-y-3 rounded-xl border border-border bg-surface/80 p-4"
        >
          <h2 className="text-sm font-bold">Upgrade to a parent/guardian account</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Parent Portal needs a separate verified adult account (18+). Confirm your date of birth
            once — students stay on this portal and share a link code with parents instead.
          </p>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Date of birth
            <input
              className="input-base mt-1"
              type="date"
              value={upgradeDob}
              onChange={(e) => setUpgradeDob(e.target.value)}
              required
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={upgradeConfirm}
              onChange={(e) => setUpgradeConfirm(e.target.checked)}
            />
            <span>I confirm I am a parent/guardian 18 years of age or older.</span>
          </label>
          <button
            type="submit"
            disabled={upgradeBusy}
            className="glow-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {upgradeBusy && <Loader2 className="size-3.5 animate-spin" />}
            Verify and unlock Parent Portal
          </button>
        </form>
      )}

      {parentMode && isParent ? (
        <ParentPortal
          userId={userId}
          subjects={subjects ?? []}
          howtoEnabled={!tourBlocksContextual}
        />
      ) : (
        <div className="space-y-5">
          <HowToContextual
            userId={userId}
            shortId="student-welcome"
            enabled={!tourBlocksContextual}
          />
          <GamificationHeader
            name={profile?.display_name ?? "Explorer"}
            xp={profile?.xp_points ?? 0}
            streak={profile?.streak_days ?? 0}
          />

          {(profile?.role ?? "student") === "student" && (
            <>
              <HowToContextual
                userId={userId}
                shortId="student-link-code"
                enabled={!tourBlocksContextual}
              />
              <ParentLinkCodeCard
                linkCode={profile?.link_code}
                parentContactEmail={profile?.parent_contact_email}
                studentName={profile?.display_name}
              />
            </>
          )}

          <HowToContextual
            userId={userId}
            shortId="student-leaderboard"
            enabled={!tourBlocksContextual}
          />
          <DailyLeaderboard userId={userId} />

          <HowToContextual
            userId={userId}
            shortId="student-subjects"
            enabled={!tourBlocksContextual}
          />
          <SubjectTabs
            subjects={subjects ?? []}
            activeId={current?.id}
            onSelect={setActiveSubject}
          />

          {current?.description && (
            <p className="text-sm text-muted-foreground">{current.description}</p>
          )}

          <motion.div
            key={current?.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {isReading ? (
              <>
                {subjectArcade && (
                  <ArcadeHub subject={subjectArcade} tasks={subjectTasks} userId={userId} />
                )}
                <HowToContextual
                  userId={userId}
                  shortId="student-books"
                  enabled={!tourBlocksContextual}
                />
                <BookStudio userId={userId} />
              </>
            ) : (
              <>
                {subjectArcade && (
                  <ArcadeHub subject={subjectArcade} tasks={subjectTasks} userId={userId} />
                )}
                <TaskBoard
                  tasks={subjectTasks}
                  loading={tasksLoading}
                  error={tasksError}
                  accent={accentFor(current?.title ?? "")}
                  userId={userId}
                  howtoEnabled={!tourBlocksContextual}
                />
              </>
            )}
          </motion.div>
        </div>
      )}
    </main>
  );
}
