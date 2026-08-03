import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Gamepad2,
  Lock,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DashGame } from "@/components/arcade/DashGame";
import { useTaskProgress, type Task } from "@/components/TaskBoard";
import { useTranslation, type TranslateFn } from "@/i18n";
import {
  modeById,
  pickRecommendedMode,
  type ArcadeSubjectDef,
} from "@/lib/arcade/index";
import {
  ARCADE_GATES_TO_UNLOCK,
  ARCADE_LEVELS,
  levelById,
  type ArcadeLevelId,
} from "@/lib/arcade/levels";
import {
  applyRunProgress,
  campaignStarsTotal,
  gatesProgressOnLevel,
  getModeProgress,
  isLevelUnlocked,
  type ModeCampaignProgress,
} from "@/lib/arcade/progress";
import { ARCADE_XP_TODO } from "@/lib/arcade/questions";

type ArcadeHubProps = {
  subject: ArcadeSubjectDef;
  tasks: Task[];
  userId: string;
};

type Playing = {
  modeId: string;
  levelId: ArcadeLevelId;
};

/** Localized mode/level names — data files keep English as the fallback. */
function modeTitle(t: TranslateFn, modeId: string): string {
  return t(`arcade.mode.${modeId}.title`);
}

function levelLabel(t: TranslateFn, levelId: ArcadeLevelId): string {
  return t(`arcade.levels.${levelId}.label`);
}

export function ArcadeHub({ subject, tasks, userId }: ArcadeHubProps) {
  const { t, formatNumber } = useTranslation();
  const { data: progress } = useTaskProgress(userId);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [hubModeId, setHubModeId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [progressTick, setProgressTick] = useState(0);

  const masteredIds = useMemo(
    () => new Set((progress ?? []).filter((p) => p.score >= 70).map((p) => p.task_id)),
    [progress],
  );

  const recommended = useMemo(
    () => pickRecommendedMode(subject, tasks, masteredIds),
    [subject, tasks, masteredIds],
  );

  const activeHubModeId = hubModeId ?? recommended.mode.id;
  const activeHubMode = modeById(subject, activeHubModeId);
  const accent = activeHubMode.theme;

  const modeProgress = useMemo(() => {
    void progressTick;
    return getModeProgress(userId, subject.key, activeHubModeId);
  }, [userId, subject.key, activeHubModeId, progressTick]);

  const refreshProgress = useCallback(() => {
    setProgressTick((t) => t + 1);
  }, []);

  const playingMode = playing ? modeById(subject, playing.modeId) : null;
  const playingLevel = playing ? levelById(playing.levelId) : null;
  const playProgress = useMemo(() => {
    if (!playing) return null;
    void progressTick;
    return getModeProgress(userId, subject.key, playing.modeId);
  }, [playing, userId, subject.key, progressTick]);

  if (playingMode && playingLevel && playProgress) {
    const gatesBanked = playProgress.gatesTowardUnlock[playingLevel.id] ?? 0;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card overflow-hidden p-4 sm:p-5"
      >
        <DashGame
          mode={playingMode}
          level={playingLevel}
          modeTitle={modeTitle(t, playingMode.id)}
          levelLabel={levelLabel(t, playingLevel.id)}
          gatesBanked={gatesBanked}
          getQuestions={(hardness) => subject.questionsForMode(playingMode.id, hardness)}
          onGateCorrect={() => {
            const result = applyRunProgress(userId, subject.key, playingMode.id, {
              type: "gate",
              levelId: playingLevel.id,
            });
            refreshProgress();
            return {
              unlockedNext: result.unlockedNext,
              newlyUnlockedLabel: result.newlyUnlockedId
                ? levelLabel(t, result.newlyUnlockedId)
                : null,
            };
          }}
          onLevelClear={(stars) => {
            const result = applyRunProgress(userId, subject.key, playingMode.id, {
              type: "clear",
              levelId: playingLevel.id,
              stars,
              isBoss: playingLevel.isBoss,
            });
            refreshProgress();
            return {
              unlockedNext: result.unlockedNext,
              newlyUnlockedLabel: result.newlyUnlockedId
                ? levelLabel(t, result.newlyUnlockedId)
                : null,
              campaignComplete: result.campaignComplete,
            };
          }}
          onExit={() => {
            setPlaying(null);
            setHubModeId(playingMode.id);
            refreshProgress();
          }}
        />
      </motion.div>
    );
  }

  return (
    <section className="surface-card relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: `
            radial-gradient(40rem 18rem at 10% -20%, ${accent.uiAccentSoft}, transparent 55%),
            radial-gradient(28rem 16rem at 95% 0%, color-mix(in oklab, var(--xp) 18%, transparent), transparent 50%)
          `,
        }}
        aria-hidden
      />

      <div className="relative p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: accent.uiAccent }}
            >
              <Gamepad2 className="size-3.5" /> {t(`arcade.subject.${subject.key}.hubTitle`)}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
              {t(`arcade.subject.${subject.key}.campaignTitle`)}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t(`arcade.subject.${subject.key}.description`)}
            </p>
          </div>
          {modeProgress.bossCleared ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-200">
              <Trophy className="size-3.5" /> {t("arcade.hub.campaignComplete")}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                const start = firstPlayableLevel(modeProgress);
                setPlaying({ modeId: activeHubModeId, levelId: start });
              }}
              className="glow-ring inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
              style={{ backgroundColor: accent.uiAccent }}
            >
              <Sparkles className="size-4" />
              {t("arcade.hub.continueMode", { mode: modeTitle(t, activeHubMode.id) })}
            </button>
          )}
        </div>

        <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="size-3.5 text-xp" />
          {t(`arcade.hub.reason.${recommended.reasonKey}`, {
            mode: modeTitle(t, recommended.mode.id),
            subject: t(`arcade.subject.${subject.key}.shortName`),
          })}
          {recommended.unitTag ? (
            <span className="rounded-md bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
              {recommended.unitTag}
            </span>
          ) : null}
        </p>

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {t("arcade.hub.unlockRule", { gates: formatNumber(ARCADE_GATES_TO_UNLOCK) })}
        </p>

        <TopicPicker
          subject={subject}
          activeId={activeHubModeId}
          recommendedId={recommended.mode.id}
          userId={userId}
          progressTick={progressTick}
          onPick={(id) => {
            setHubModeId(id);
            setExpanded(false);
          }}
          expanded={expanded}
          onToggleExpand={() => setExpanded((v) => !v)}
        />

        <LevelLadder
          modeTitle={modeTitle(t, activeHubMode.id)}
          progress={modeProgress}
          accent={accent.uiAccent}
          accentSoft={accent.uiAccentSoft}
          onPlay={(levelId) => setPlaying({ modeId: activeHubModeId, levelId })}
        />

        <span className="sr-only">{ARCADE_XP_TODO}</span>
      </div>
    </section>
  );
}

function firstPlayableLevel(progress: ModeCampaignProgress): ArcadeLevelId {
  for (let i = progress.unlockedIndex; i >= 0; i--) {
    const level = ARCADE_LEVELS[i]!;
    if (!progress.cleared[level.id]) return level.id;
  }
  return ARCADE_LEVELS[Math.min(progress.unlockedIndex, ARCADE_LEVELS.length - 1)]!.id;
}

function TopicPicker({
  subject,
  activeId,
  recommendedId,
  userId,
  progressTick,
  onPick,
  expanded,
  onToggleExpand,
}: {
  subject: ArcadeSubjectDef;
  activeId: string;
  recommendedId: string;
  userId: string;
  progressTick: number;
  onPick: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { t, formatNumber } = useTranslation();
  const activeMode = modeById(subject, activeId);
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-foreground">
          {t("arcade.hub.topicLabel", { mode: modeTitle(t, activeMode.id) })}
        </p>
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          {expanded ? t("arcade.hub.hideTopics") : t("arcade.hub.switchTopic")}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 grid gap-2 overflow-hidden sm:grid-cols-2"
          >
            {subject.modes.map((mode) => {
              const isRec = mode.id === recommendedId;
              const isActive = mode.id === activeId;
              void progressTick;
              const mp = getModeProgress(userId, subject.key, mode.id);
              const stars = campaignStarsTotal(mp);
              return (
                <li key={mode.id}>
                  <button
                    type="button"
                    onClick={() => onPick(mode.id)}
                    className="w-full rounded-xl border p-3 text-start transition hover:bg-secondary/60"
                    style={
                      isActive
                        ? {
                            borderColor: mode.theme.uiAccent,
                            backgroundColor: mode.theme.uiAccentSoft,
                          }
                        : isRec
                          ? {
                              borderColor: `${mode.theme.uiAccent}66`,
                              backgroundColor: "color-mix(in oklab, var(--background) 60%, transparent)",
                            }
                          : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-bold">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: mode.theme.uiAccent }}
                          aria-hidden
                        />
                        {modeTitle(t, mode.id)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {mp.bossCleared && (
                          <Trophy
                            className="size-3.5 text-amber-300"
                            aria-label={t("arcade.hub.campaignCompleteAria")}
                          />
                        )}
                        {isRec && (
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: mode.theme.uiAccentSoft,
                              color: mode.theme.uiAccent,
                            }}
                          >
                            {t("arcade.hub.suggested")}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t(`arcade.mode.${mode.id}.blurb`)}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-xp">
                      <Zap className="size-3" />{" "}
                      {t("arcade.hub.modeStars", {
                        stars: formatNumber(stars),
                        level: formatNumber(mp.unlockedIndex + 1),
                      })}
                      {mp.bossCleared ? t("arcade.hub.bossCleared") : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function LevelLadder({
  modeTitle,
  progress,
  accent,
  accentSoft,
  onPlay,
}: {
  modeTitle: string;
  progress: ModeCampaignProgress;
  accent: string;
  accentSoft: string;
  onPlay: (levelId: ArcadeLevelId) => void;
}) {
  const { t, formatNumber } = useTranslation();
  const furthest = ARCADE_LEVELS[progress.unlockedIndex] ?? ARCADE_LEVELS[0]!;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-bold">
            {t("arcade.hub.levelsTitle", { mode: modeTitle })}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {t("arcade.hub.unlockedThrough", { level: levelLabel(t, furthest.id) })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-xp">
          <Star className="size-3 fill-xp" />
          {t("arcade.hub.starsTotal", { stars: formatNumber(campaignStarsTotal(progress)) })}
        </span>
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-5">
        {ARCADE_LEVELS.map((level) => {
          const unlocked = isLevelUnlocked(progress, level.id);
          const cleared = Boolean(progress.cleared[level.id]);
          const stars = progress.stars[level.id] ?? 0;
          const gates = gatesProgressOnLevel(progress, level.id);
          const showGateMeter =
            unlocked &&
            !cleared &&
            !level.isBoss &&
            progress.unlockedIndex === ARCADE_LEVELS.indexOf(level);

          return (
            <li key={level.id}>
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => onPlay(level.id)}
                className={`flex h-full w-full flex-col rounded-xl border p-3 text-start transition ${
                  !unlocked
                    ? "cursor-not-allowed border-border/60 bg-background/20 opacity-60"
                    : level.isBoss
                      ? "hover:brightness-110"
                      : cleared
                        ? "hover:brightness-110"
                        : "border-border bg-background/50 hover:bg-secondary/60"
                }`}
                style={
                  !unlocked
                    ? undefined
                    : level.isBoss
                      ? {
                          borderColor: `${accent}66`,
                          backgroundColor: accentSoft,
                        }
                      : cleared
                        ? {
                            borderColor: `${accent}80`,
                            backgroundColor: accentSoft,
                          }
                        : undefined
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1 text-xs font-bold">
                    {level.isBoss ? (
                      <Crown className="size-3.5" style={{ color: accent }} />
                    ) : null}
                    {levelLabel(t, level.id)}
                  </span>
                  {!unlocked ? (
                    <Lock className="size-3.5 text-muted-foreground" />
                  ) : cleared ? (
                    <Trophy className="size-3.5 text-xp" />
                  ) : null}
                </div>
                <p className="mt-1 flex-1 text-[10px] leading-snug text-muted-foreground">
                  {t(`arcade.levels.${level.id}.blurb`)}
                </p>
                {unlocked && stars > 0 && (
                  <span className="mt-2 inline-flex gap-0.5 text-xp">
                    {([1, 2, 3] as const).map((n) => (
                      <Star
                        key={n}
                        className={`size-3 ${n <= stars ? "fill-xp text-xp" : "text-muted-foreground/40"}`}
                      />
                    ))}
                  </span>
                )}
                {showGateMeter && (
                  <span className="mt-2 text-[10px] font-semibold" style={{ color: accent }}>
                    {t("arcade.hub.gatesToUnlock", {
                      current: formatNumber(gates.current),
                      needed: formatNumber(ARCADE_GATES_TO_UNLOCK),
                    })}
                  </span>
                )}
                {unlocked && !cleared && level.isBoss && (
                  <span className="mt-2 text-[10px] font-semibold" style={{ color: accent }}>
                    {t("arcade.hub.finalChallenge")}
                  </span>
                )}
                {!unlocked && (
                  <span className="mt-2 text-[10px] font-semibold text-muted-foreground">
                    {t("arcade.hub.locked")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
