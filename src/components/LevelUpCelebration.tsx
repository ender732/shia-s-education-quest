import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Trophy, Zap } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "@/i18n";
import { celebrateLevelUp } from "@/lib/confetti";
import type { LevelUpInfo } from "@/lib/gamification";
import { XP_PER_LEVEL, levelProgress, levelTitleKey } from "@/lib/gamification";

type LevelUpCelebrationProps = {
  info: LevelUpInfo | null;
  onClose: () => void;
};

/**
 * Full-screen level-up moment — shown when XP crosses a 500-XP level boundary.
 */
export function LevelUpCelebration({ info, onClose }: LevelUpCelebrationProps) {
  const { t, formatNumber } = useTranslation();

  useEffect(() => {
    if (!info) return;
    void celebrateLevelUp();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [info, onClose]);

  const progress = info ? levelProgress(info.newXp) : null;
  const levelsGained = info ? info.toLevel - info.fromLevel : 0;

  return (
    <AnimatePresence>
      {info && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-up-title"
        >
          <motion.button
            type="button"
            aria-label={t("gamification.levelUp.dismissAria")}
            className="absolute inset-0 border-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.55)_0%,rgba(2,6,23,0.92)_70%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-xp/40 bg-gradient-to-b from-card via-card to-background p-8 text-center shadow-2xl shadow-xp/20"
            initial={{ opacity: 0, scale: 0.84, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            <motion.div
              className="pointer-events-none absolute -left-16 -top-16 size-40 rounded-full bg-xp/20 blur-3xl"
              animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.15, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="pointer-events-none absolute -bottom-20 -right-12 size-44 rounded-full bg-primary/25 blur-3xl"
              animate={{ opacity: [0.25, 0.55, 0.25], scale: [1.1, 1, 1.1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-xp/15 ring-4 ring-xp/30"
              initial={{ rotate: -18, scale: 0.4 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.08 }}
            >
              <Trophy className="size-10 text-xp" aria-hidden />
            </motion.div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-xp">
              {t("gamification.levelUp.eyebrow")}
            </p>
            <h2
              id="level-up-title"
              className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl"
            >
              {t("gamification.levelUp.level", { level: formatNumber(info.toLevel) })}
            </h2>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              {t("gamification.levelUp.earnedTitle")}{" "}
              <span className="text-foreground">
                {t(levelTitleKey(info.toLevel), { level: formatNumber(info.toLevel) })}
              </span>
            </p>

            {levelsGained > 1 && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" aria-hidden />
                {t("gamification.levelUp.multiLevel", { count: levelsGained })}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 text-start">
              <div className="rounded-2xl border border-border bg-background/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("gamification.levelUp.was")}
                </p>
                <p className="mt-1 text-lg font-black">
                  {t("gamification.levelUp.level", { level: formatNumber(info.fromLevel) })}
                </p>
              </div>
              <div className="rounded-2xl border border-xp/30 bg-xp/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-xp">
                  {t("gamification.levelUp.now")}
                </p>
                <p className="mt-1 text-lg font-black text-xp">
                  {t("gamification.levelUp.level", { level: formatNumber(info.toLevel) })}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3 text-start">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Zap className="size-3.5 text-xp" aria-hidden />
                  {t("gamification.levelUp.xpThisWin", { xp: formatNumber(info.xpGained) })}
                </span>
                <span className="text-foreground">
                  {t("gamification.levelUp.totalXp", { xp: formatNumber(info.newXp) })}
                </span>
              </div>
              {progress && (
                <>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-xp"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(progress.percent, 4)}%` }}
                      transition={{ delay: 0.35, duration: 0.9, ease: "easeOut" }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {t("gamification.levelUp.towardNextLevel", {
                      into: formatNumber(progress.into),
                      needed: formatNumber(XP_PER_LEVEL),
                      level: formatNumber(info.toLevel + 1),
                    })}
                  </p>
                </>
              )}
            </div>

            <motion.button
              type="button"
              onClick={onClose}
              className="mt-7 w-full rounded-xl bg-xp px-4 py-3 text-sm font-black text-background shadow-lg shadow-xp/25 transition hover:brightness-110"
              whileTap={{ scale: 0.98 }}
              autoFocus
            >
              {t("gamification.levelUp.dismiss")}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
