import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { HowToShortPlayer } from "@/components/howto/HowToShortPlayer";
import {
  isHowToShortSeen,
  markHowToShortSeen,
} from "@/lib/howto-progress";
import {
  claimHowToSlot,
  getHowToSlotVersion,
  isHowToSlotFree,
  releaseHowToSlot,
  subscribeHowToSlot,
} from "@/lib/howto-lock";
import { getHowToShort } from "@/lib/howto-shorts";

type Options = {
  userId: string | undefined;
  shortId: string;
  /** When false, never auto-open (e.g. tour still running). */
  enabled?: boolean;
};

/**
 * Auto-opens a contextual short once if unseen and the global how-to slot is free.
 */
export function useHowToShort({ userId, shortId, enabled = true }: Options) {
  const [manualOpen, setManualOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const slotVersion = useSyncExternalStore(
    subscribeHowToSlot,
    getHowToSlotVersion,
    () => 0,
  );

  const short = getHowToShort(shortId);
  const ownerId = `contextual:${shortId}`;

  useEffect(() => {
    if (!userId || !enabled || !short || manualOpen) return;
    if (isHowToShortSeen(userId, shortId)) return;
    if (!isHowToSlotFree()) return;
    if (!claimHowToSlot(ownerId)) return;
    setAutoOpen(true);
  }, [userId, shortId, enabled, short, manualOpen, slotVersion, ownerId]);

  const open = manualOpen || autoOpen;

  const close = useCallback(
    (reason: "done" | "skip") => {
      if (userId) markHowToShortSeen(userId, shortId);
      setManualOpen(false);
      setAutoOpen(false);
      releaseHowToSlot(ownerId);
      void reason;
    },
    [userId, shortId, ownerId],
  );

  const replay = useCallback(() => {
    if (!short) return;
    if (!claimHowToSlot(ownerId) && !isHowToSlotFree(ownerId)) return;
    setManualOpen(true);
  }, [short, ownerId]);

  const player =
    short && open ? (
      <HowToShortPlayer short={short} open={open} onClose={close} />
    ) : null;

  return { player, replay, open };
}
