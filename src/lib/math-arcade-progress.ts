/**
 * @deprecated Prefer `@/lib/arcade/progress` (keyed by userId + subject + mode).
 * Math-only wrapper that reads/writes the shared store under subject key "math".
 */

import {
  applyRunProgress as applyShared,
  campaignStarsTotal,
  gatesProgressOnLevel,
  getAllArcadeProgress as getAllShared,
  getModeProgress as getShared,
  isLevelUnlocked,
  unlockRuleCopy,
  type ModeCampaignProgress,
  type ProgressApplyResult,
  type RunProgressEvent,
} from "@/lib/arcade/progress";
import type { MathArcadeModeId } from "@/lib/math-arcade";

export type { ModeCampaignProgress, ProgressApplyResult, RunProgressEvent };

export {
  campaignStarsTotal,
  gatesProgressOnLevel,
  isLevelUnlocked,
  unlockRuleCopy,
};

export function getModeProgress(userId: string, modeId: MathArcadeModeId | string) {
  return getShared(userId, "math", modeId);
}

export function getAllArcadeProgress(userId: string) {
  return getAllShared(userId, "math");
}

export function applyRunProgress(
  userId: string,
  modeId: MathArcadeModeId | string,
  event: RunProgressEvent,
): ProgressApplyResult {
  return applyShared(userId, "math", modeId, event);
}
