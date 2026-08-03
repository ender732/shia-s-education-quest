import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Check,
  ClipboardList,
  Flame,
  GraduationCap,
  Lightbulb,
  Link2,
  Pencil,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "@/i18n";
import type { HowToShort, HowToScene } from "@/lib/howto-shorts";

const ICON_MAP: Record<HowToScene["icon"], LucideIcon> = {
  sparkles: Sparkles,
  trophy: Trophy,
  link: Link2,
  book: BookOpen,
  graduation: GraduationCap,
  flame: Flame,
  clipboard: ClipboardList,
  upload: Upload,
  users: Users,
  barChart: BarChart3,
  lightbulb: Lightbulb,
  rocket: Rocket,
  check: Check,
  pencil: Pencil,
  shield: ShieldCheck,
};

type HowToShortPlayerProps = {
  short: HowToShort;
  open: boolean;
  onClose: (reason: "done" | "skip") => void;
  /** Extra footer action, e.g. Skip all tour. Already-translated label. */
  onSkipAll?: () => void;
  skipAllLabel?: string;
  /** Persistently hide all auto tips app-wide. */
  onHideAll?: () => void;
  hideAllLabel?: string;
};

export function HowToShortPlayer({
  short,
  open,
  onClose,
  onSkipAll,
  skipAllLabel,
  onHideAll,
  hideAllLabel,
}: HowToShortPlayerProps) {
  const titleId = useId();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open, short.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const scene = short.scenes[index];
  const Icon = ICON_MAP[scene.icon] ?? Sparkles;
  const isLast = index >= short.scenes.length - 1;
  const sceneKey = `howto.shorts.${short.id}.scenes.${index + 1}`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {t("howto.player.eyebrow")}
            </p>
            <h2 id={titleId} className="mt-0.5 text-base font-bold text-foreground">
              {t(`howto.shorts.${short.id}.title`)}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onClose("skip")}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={t("howto.player.closeAria")}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-4 px-5 py-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${short.id}-${index}`}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ scale: 0.7, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="flex size-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary"
              >
                <Icon className="size-10" aria-hidden />
              </motion.div>
              {scene.emphasis && (
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t(`${sceneKey}.emphasis`)}
                </p>
              )}
              <p className="max-w-sm text-lg font-semibold leading-snug text-foreground sm:text-xl">
                {t(`${sceneKey}.caption`)}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-1.5 pb-2" aria-hidden>
          {short.scenes.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i === index ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold disabled:opacity-40"
            >
              {t("howto.player.back")}
            </button>
            {onSkipAll && (
              <button
                type="button"
                onClick={onSkipAll}
                className="min-h-11 rounded-xl px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {skipAllLabel ?? t("howto.player.skipAllTips")}
              </button>
            )}
            {onHideAll && (
              <button
                type="button"
                onClick={onHideAll}
                className="min-h-11 rounded-xl px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {hideAllLabel ?? t("howto.player.hideAllTips")}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (isLast) onClose("done");
              else setIndex((i) => i + 1);
            }}
            className="glow-ring min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            {isLast ? t("howto.player.gotIt") : t("howto.player.next")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
