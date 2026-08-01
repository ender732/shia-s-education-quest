import { CircleHelp, Play, RotateCcw, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  clearHowToTourComplete,
  resetAllHowToTips,
} from "@/lib/howto-progress";
import { claimHowToSlot, isHowToSlotFree, releaseHowToSlot } from "@/lib/howto-lock";
import { getHowToShort, shortsForRole } from "@/lib/howto-shorts";
import { HowToShortPlayer } from "@/components/howto/HowToShortPlayer";

type HowToHelpMenuProps = {
  userId: string;
  role: "student" | "parent";
  onReplayTour: () => void;
};

export function HowToHelpMenu({ userId, role, onReplayTour }: HowToHelpMenuProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [replayId, setReplayId] = useState<string | null>(null);
  const shorts = useMemo(() => shortsForRole(role), [role]);
  const replayShort = replayId ? getHowToShort(replayId) : undefined;

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
          How-to shorts
        </button>

        {open && (
          <div
            id={panelId}
            className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-border bg-surface p-3 shadow-lg"
            role="menu"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {role === "parent" ? "Parent tips" : "Student tips"}
              </p>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Close help menu"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {shorts.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => startReplay(s.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <Play className="size-3.5 shrink-0 text-primary" />
                    <span className="font-medium leading-snug">{s.title}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  clearHowToTourComplete(userId, role);
                  setOpen(false);
                  onReplayTour();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold hover:bg-secondary"
              >
                <Play className="size-3.5 text-primary" />
                Replay welcome tour
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllHowToTips(userId);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                Reset all tips
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
        />
      )}
    </>
  );
}
