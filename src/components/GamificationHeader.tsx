import { motion } from "framer-motion";
import { Flame, Sparkles, Trophy, Zap } from "lucide-react";
import { useTranslation } from "@/i18n";
import { levelForXp, levelProgress } from "@/lib/gamification";

type Props = {
  name: string;
  xp: number;
  streak: number;
};

export function GamificationHeader({ name, xp, streak }: Props) {
  const { t, formatNumber } = useTranslation();
  const level = levelForXp(xp);
  const { into, needed, percent } = levelProgress(xp);

  return (
    <section className="surface-card hero-gradient relative overflow-hidden p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            {t("app.school")}
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            {t("gamification.welcomeBack", { name })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("gamification.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            icon={<Trophy className="size-4 text-xp" />}
            label={t("gamification.level")}
            value={formatNumber(level)}
          />
          <Badge
            icon={<Zap className="size-4 text-primary" />}
            label={t("gamification.totalXp")}
            value={formatNumber(xp)}
          />
          <Badge
            icon={<Flame className="size-4 text-streak" />}
            label={t("gamification.dayStreak")}
            value={t("gamification.streakValue", { days: formatNumber(streak) })}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{t("gamification.progressToLevel", { level: formatNumber(level + 1) })}</span>
          <span>
            {t("gamification.xpOfNeeded", {
              into: formatNumber(into),
              needed: formatNumber(needed),
            })}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="xp-gradient h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
          />
        </div>
      </div>
    </section>
  );
}

function Badge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3.5 py-2 backdrop-blur">
      {icon}
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    </div>
  );
}
