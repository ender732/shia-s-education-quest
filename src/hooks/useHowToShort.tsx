import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { HowToShortPlayer } from "@/components/howto/HowToShortPlayer";
import {
  areHowToTipsHidden,
  getHowToTipsHiddenVersion,
  hideAllHowToTips,
  isHowToShortSeen,
  markHowToShortSeen,
  subscribeHowToTipsHidden,
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
 * Respects the per-user "Hide all tips" preference for auto-show only.
 */
export function useHowToShort({ userId, shortId, enabled = true }: Options) {
  const [manualOpen, setManualOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const slotVersion = useSyncExternalStore(
    subscribeHowToSlot,
    getHowToSlotVersion,
    () => 0,
  );
  const tipsHiddenVersion = useSyncExternalStore(
    subscribeHowToTipsHidden,
    getHowToTipsHiddenVersion,
    () => 0,
  );

  const short = getHowToShort(shortId);
  const ownerId = `contextual:${shortId}`;
  const tipsHidden = Boolean(userId && areHowToTipsHidden(userId));
  void tipsHiddenVersion;

  useEffect(() => {
    if (!userId || !enabled || !short || manualOpen) return;
    if (areHowToTipsHidden(userId)) return;
    if (isHowToShortSeen(userId, shortId)) return;
    if (!isHowToSlotFree()) return;
    if (!claimHowToSlot(ownerId)) return;
    setAutoOpen(true);
  }, [userId, shortId, enabled, short, manualOpen, slotVersion, ownerId, tipsHiddenVersion]);

  // Global hide closes any auto-open tip immediately.
  useEffect(() => {
    if (!userId || !tipsHidden || !autoOpen) return;
    setAutoOpen(false);
    releaseHowToSlot(ownerId);
  }, [userId, tipsHidden, autoOpen, ownerId]);

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

  const hideAll = useCallback(() => {
    if (userId) hideAllHowToTips(userId);
    setManualOpen(false);
    setAutoOpen(false);
    releaseHowToSlot(ownerId);
  }, [userId, ownerId]);

  const replay = useCallback(() => {
    if (!short) return;
    if (!claimHowToSlot(ownerId) && !isHowToSlotFree(ownerId)) return;
    setManualOpen(true);
  }, [short, ownerId]);

  const player =
    short && open ? (
      <HowToShortPlayer
        short={short}
        open={open}
        onClose={close}
        onHideAll={hideAll}
      />
    ) : null;

  return { player, replay, open };
}
