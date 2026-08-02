import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { HowToShortPlayer } from "@/components/howto/HowToShortPlayer";
import {
  areHowToTipsHidden,
  getHowToTipsHiddenVersion,
  hideAllHowToTips,
  isHowToTourComplete,
  markHowToShortSeen,
  markHowToTourComplete,
  skipHowToTour,
  subscribeHowToTipsHidden,
} from "@/lib/howto-progress";
import {
  claimHowToSlot,
  releaseHowToSlot,
} from "@/lib/howto-lock";
import { getHowToShort, tourIdsForRole } from "@/lib/howto-shorts";

const TOUR_OWNER = "tour";

type HowToTourProps = {
  userId: string;
  role: "student" | "parent";
  /** Force start (Help → Replay tour). */
  forceRun?: boolean;
  onForceHandled?: () => void;
  onTourActiveChange?: (active: boolean) => void;
};

export function HowToTour({
  userId,
  role,
  forceRun,
  onForceHandled,
  onTourActiveChange,
}: HowToTourProps) {
  const playlist = useMemo(() => tourIdsForRole(role), [role]);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [manualTour, setManualTour] = useState(false);
  const tipsHiddenVersion = useSyncExternalStore(
    subscribeHowToTipsHidden,
    getHowToTipsHiddenVersion,
    () => 0,
  );
  const tipsHidden = areHowToTipsHidden(userId);
  void tipsHiddenVersion;

  useEffect(() => {
    onTourActiveChange?.(active);
  }, [active, onTourActiveChange]);

  useEffect(() => {
    if (forceRun) {
      if (claimHowToSlot(TOUR_OWNER)) {
        setStep(0);
        setManualTour(true);
        setActive(true);
      }
      onForceHandled?.();
      return;
    }
    if (areHowToTipsHidden(userId)) return;
    if (isHowToTourComplete(userId, role)) return;
    if (!claimHowToSlot(TOUR_OWNER)) return;
    setStep(0);
    setManualTour(false);
    setActive(true);
  }, [userId, role, forceRun, onForceHandled, tipsHiddenVersion]);

  // Global hide stops an auto-running tour (not Help → Replay).
  useEffect(() => {
    if (!tipsHidden || !active || manualTour) return;
    setActive(false);
    releaseHowToSlot(TOUR_OWNER);
  }, [tipsHidden, active, manualTour]);

  const short = active ? getHowToShort(playlist[step] ?? "") : undefined;

  const finishTour = useCallback(() => {
    markHowToTourComplete(userId, role);
    setActive(false);
    setManualTour(false);
    releaseHowToSlot(TOUR_OWNER);
  }, [userId, role]);

  const onClose = useCallback(
    (reason: "done" | "skip") => {
      const id = playlist[step];
      if (id) markHowToShortSeen(userId, id);
      void reason;

      if (step >= playlist.length - 1) {
        finishTour();
        return;
      }
      setStep((s) => s + 1);
    },
    [playlist, step, userId, finishTour],
  );

  const onSkipAll = useCallback(() => {
    skipHowToTour(userId, role);
    setActive(false);
    setManualTour(false);
    releaseHowToSlot(TOUR_OWNER);
  }, [userId, role]);

  const onHideAll = useCallback(() => {
    hideAllHowToTips(userId);
    setActive(false);
    setManualTour(false);
    releaseHowToSlot(TOUR_OWNER);
  }, [userId]);

  if (!active || !short) return null;

  return (
    <HowToShortPlayer
      short={short}
      open
      onClose={onClose}
      onSkipAll={onSkipAll}
      skipAllLabel="Skip tour"
      onHideAll={onHideAll}
    />
  );
}
