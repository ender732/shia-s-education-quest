/**
 * Arcade campaign progress — localStorage keyed by userId + subject + mode.
 * Unlock: finish the track OR pass 7 gates on a level → unlock next.
 * Gates carry across runs on the same level until unlock.
 *
 * Migrates legacy Math progress from `math-arcade:v1:` into `arcade:v1:…:math`.
 */

import {
  ARCADE_GATES_TO_UNLOCK,
  ARCADE_LEVELS,
  type ArcadeLevelId,
  bossLevel,
  levelIndex,
} from "@/lib/arcade/levels";
import type { ArcadeSubjectKey } from "@/lib/arcade/types";

const PREFIX = "arcade:v1:";
const LEGACY_MATH_PREFIX = "math-arcade:v1:";

export type ModeCampaignProgress = {
  unlockedIndex: number;
  gatesTowardUnlock: Partial<Record<ArcadeLevelId, number>>;
  cleared: Partial<Record<ArcadeLevelId, boolean>>;
  stars: Partial<Record<ArcadeLevelId, 1 | 2 | 3>>;
  bossCleared: boolean;
};

export type ArcadeProgressStore = Record<string, ModeCampaignProgress>;

function storageKey(userId: string, subjectKey: ArcadeSubjectKey): string {
  return `${PREFIX}${userId}:${subjectKey}`;
}

function emptyMode(): ModeCampaignProgress {
  return {
    unlockedIndex: 0,
    gatesTowardUnlock: {},
    cleared: {},
    stars: {},
    bossCleared: false,
  };
}

function normalizeMode(raw: ModeCampaignProgress | undefined): ModeCampaignProgress {
  if (!raw) return emptyMode();
  const maxIdx = ARCADE_LEVELS.length - 1;
  return {
    unlockedIndex: Math.max(0, Math.min(maxIdx, Number(raw.unlockedIndex) || 0)),
    gatesTowardUnlock: raw.gatesTowardUnlock ?? {},
    cleared: raw.cleared ?? {},
    stars: raw.stars ?? {},
    bossCleared: Boolean(raw.bossCleared),
  };
}

function readStore(userId: string, subjectKey: ArcadeSubjectKey): ArcadeProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const key = storageKey(userId, subjectKey);
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as ArcadeProgressStore;

    // One-time migrate Math legacy store
    if (subjectKey === "math") {
      const legacy = window.localStorage.getItem(`${LEGACY_MATH_PREFIX}${userId}`);
      if (legacy) {
        const parsed = JSON.parse(legacy) as ArcadeProgressStore;
        window.localStorage.setItem(key, legacy);
        return parsed;
      }
    }
    return {};
  } catch {
    return {};
  }
}

function writeStore(
  userId: string,
  subjectKey: ArcadeSubjectKey,
  store: ArcadeProgressStore,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId, subjectKey), JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function getModeProgress(
  userId: string,
  subjectKey: ArcadeSubjectKey,
  modeId: string,
): ModeCampaignProgress {
  return normalizeMode(readStore(userId, subjectKey)[modeId]);
}

export function getAllArcadeProgress(
  userId: string,
  subjectKey: ArcadeSubjectKey,
): ArcadeProgressStore {
  const store = readStore(userId, subjectKey);
  const out: ArcadeProgressStore = {};
  for (const key of Object.keys(store)) {
    out[key] = normalizeMode(store[key]);
  }
  return out;
}

function saveMode(
  userId: string,
  subjectKey: ArcadeSubjectKey,
  modeId: string,
  progress: ModeCampaignProgress,
) {
  const store = readStore(userId, subjectKey);
  store[modeId] = progress;
  writeStore(userId, subjectKey, store);
}

export function isLevelUnlocked(
  progress: ModeCampaignProgress,
  levelId: ArcadeLevelId,
): boolean {
  return levelIndex(levelId) <= progress.unlockedIndex;
}

export function gatesProgressOnLevel(
  progress: ModeCampaignProgress,
  levelId: ArcadeLevelId,
): { current: number; needed: number; complete: boolean } {
  const current = Math.min(
    ARCADE_GATES_TO_UNLOCK,
    progress.gatesTowardUnlock[levelId] ?? 0,
  );
  return {
    current,
    needed: ARCADE_GATES_TO_UNLOCK,
    complete: current >= ARCADE_GATES_TO_UNLOCK || Boolean(progress.cleared[levelId]),
  };
}

export type RunProgressEvent =
  | { type: "gate"; levelId: ArcadeLevelId }
  | {
      type: "clear";
      levelId: ArcadeLevelId;
      stars: 1 | 2 | 3;
      isBoss: boolean;
    };

export type ProgressApplyResult = {
  progress: ModeCampaignProgress;
  unlockedNext: boolean;
  newlyUnlockedId: ArcadeLevelId | null;
  campaignComplete: boolean;
};

export function applyRunProgress(
  userId: string,
  subjectKey: ArcadeSubjectKey,
  modeId: string,
  event: RunProgressEvent,
): ProgressApplyResult {
  const progress = getModeProgress(userId, subjectKey, modeId);
  let unlockedNext = false;
  let newlyUnlockedId: ArcadeLevelId | null = null;

  const tryUnlockFrom = (levelId: ArcadeLevelId) => {
    const idx = levelIndex(levelId);
    if (idx < progress.unlockedIndex) return;
    if (idx !== progress.unlockedIndex) return;
    const nextIdx = idx + 1;
    if (nextIdx >= ARCADE_LEVELS.length) return;
    if (progress.unlockedIndex >= nextIdx) return;
    progress.unlockedIndex = nextIdx;
    unlockedNext = true;
    newlyUnlockedId = ARCADE_LEVELS[nextIdx]!.id;
  };

  if (event.type === "gate") {
    const prev = progress.gatesTowardUnlock[event.levelId] ?? 0;
    const next = Math.min(ARCADE_GATES_TO_UNLOCK, prev + 1);
    progress.gatesTowardUnlock[event.levelId] = next;
    if (next >= ARCADE_GATES_TO_UNLOCK) {
      tryUnlockFrom(event.levelId);
    }
  } else {
    progress.cleared[event.levelId] = true;
    progress.gatesTowardUnlock[event.levelId] = ARCADE_GATES_TO_UNLOCK;
    const prevStars = progress.stars[event.levelId] ?? 0;
    if (event.stars > prevStars) {
      progress.stars[event.levelId] = event.stars;
    }
    if (event.isBoss) {
      progress.bossCleared = true;
    }
    tryUnlockFrom(event.levelId);
  }

  saveMode(userId, subjectKey, modeId, progress);

  return {
    progress,
    unlockedNext,
    newlyUnlockedId,
    campaignComplete: progress.bossCleared || Boolean(progress.cleared[bossLevel().id]),
  };
}

export function campaignStarsTotal(progress: ModeCampaignProgress): number {
  let n = 0;
  for (const level of ARCADE_LEVELS) {
    n += progress.stars[level.id] ?? 0;
  }
  return n;
}

export function unlockRuleCopy(): string {
  return `Clear the track or pass ${ARCADE_GATES_TO_UNLOCK} gates to unlock the next level. Gates count even if you run out of hearts later.`;
}
