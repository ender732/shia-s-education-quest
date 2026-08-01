import { useCallback, useEffect, useMemo, useState } from "react";
import { HowToShortPlayer } from "@/components/howto/HowToShortPlayer";
import {
  isHowToTourComplete,
  markHowToShortSeen,
  markHowToTourComplete,
  skipHowToTour,
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

  useEffect(() => {
    onTourActiveChange?.(active);
  }, [active, onTourActiveChange]);

  useEffect(() => {
    if (forceRun) {
      if (claimHowToSlot(TOUR_OWNER)) {
        setStep(0);
        setActive(true);
      }
      onForceHandled?.();
      return;
    }
    if (isHowToTourComplete(userId, role)) return;
    if (!claimHowToSlot(TOUR_OWNER)) return;
    setStep(0);
    setActive(true);
  }, [userId, role, forceRun, onForceHandled]);

  const short = active ? getHowToShort(playlist[step] ?? "") : undefined;

  const finishTour = useCallback(() => {
    markHowToTourComplete(userId, role);
    setActive(false);
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
    releaseHowToSlot(TOUR_OWNER);
  }, [userId, role]);

  if (!active || !short) return null;

  return (
    <HowToShortPlayer
      short={short}
      open
      onClose={onClose}
      onSkipAll={onSkipAll}
      skipAllLabel="Skip tour"
    />
  );
}
