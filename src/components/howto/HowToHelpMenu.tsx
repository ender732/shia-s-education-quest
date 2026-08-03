import { CircleHelp, Eye, EyeOff, Play, RotateCcw, X } from "lucide-react";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import {
  areHowToTipsHidden,
  clearHowToTourComplete,
  getHowToTipsHiddenVersion,
  hideAllHowToTips,
  resetAllHowToTips,
  showHowToTips,
  subscribeHowToTipsHidden,
} from "@/lib/howto-progress";
import { claimHowToSlot, isHowToSlotFree, releaseHowToSlot } from "@/lib/howto-lock";
import { getHowToShort, shortsForRole } from "@/lib/howto-shorts";
import { useTranslation } from "@/i18n";
import { HowToShortPlayer } from "@/components/howto/HowToShortPlayer";

type HowToHelpMenuProps = {
  userId: string;
  role: "student" | "parent";
  onReplayTour: () => void;
};

export function HowToHelpMenu({ userId, role, onReplayTour }: HowToHelpMenuProps) {
  const panelId = useId();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [replayId, setReplayId] = useState<string | null>(null);
  const shorts = useMemo(() => shortsForRole(role), [role]);
  const replayShort = replayId ? getHowToShort(replayId) : undefined;
  const tipsHiddenVersion = useSyncExternalStore(
    subscribeHowToTipsHidden,
    getHowToTipsHiddenVersion,
    () => 0,
  );
  const tipsHidden = areHowToTipsHidden(userId);
  void tipsHiddenVersion;

  function startReplay(id: string) {
    const owner = `help:${id}`;
    if (!claimHowToSlot(owner) && !isHowToSlotFree(owner)) return;
    setOpen(false);
    setReplayId(id);
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
        >
          <CircleHelp className="size-3.5 text-primary" />
          {tipsHidden ? t("howto.menu.openHelp") : t("howto.menu.openShorts")}
        </button>

        {open && (
          <div
            id={panelId}
            className="absolute end-0 z-40 mt-2 w-72 rounded-xl border border-border bg-surface p-3 shadow-lg"
            role="menu"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {role === "parent" ? t("howto.menu.parentTips") : t("howto.menu.studentTips")}
              </p>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                aria-label={t("howto.menu.closeAria")}
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            {tipsHidden && (
              <p className="mb-2 rounded-lg bg-secondary/60 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
                {t("howto.menu.tipsHiddenNote")}
              </p>
            )}

            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {shorts.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => startReplay(s.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-sm hover:bg-secondary"
                  >
                    <Play className="size-3.5 shrink-0 text-primary" />
                    <span className="font-medium leading-snug">{t(`howto.shorts.${s.id}.title`)}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  if (tipsHidden) {
                    showHowToTips(userId);
                  } else {
                    hideAllHowToTips(userId);
                  }
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-xs font-semibold hover:bg-secondary"
              >
                {tipsHidden ? (
                  <>
                    <Eye className="size-3.5 text-primary" />
                    {t("howto.menu.showTips")}
                  </>
                ) : (
                  <>
                    <EyeOff className="size-3.5 text-primary" />
                    {t("howto.menu.hideAllTips")}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearHowToTourComplete(userId, role);
                  setOpen(false);
                  onReplayTour();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-xs font-semibold hover:bg-secondary"
              >
                <Play className="size-3.5 text-primary" />
                {t("howto.menu.replayTour")}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllHowToTips(userId);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                {t("howto.menu.resetTips")}
              </button>
            </div>
          </div>
        )}
      </div>

      {replayShort && (
        <HowToShortPlayer
          short={replayShort}
          open
          onClose={() => {
            releaseHowToSlot(`help:${replayShort.id}`);
            setReplayId(null);
          }}
          onHideAll={() => {
            hideAllHowToTips(userId);
            releaseHowToSlot(`help:${replayShort.id}`);
            setReplayId(null);
          }}
        />
      )}
    </>
  );
}
