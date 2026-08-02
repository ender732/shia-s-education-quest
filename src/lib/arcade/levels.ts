/**
 * Arcade level ladder — shared across subjects and topic modes.
 * L1 → L2 → L3 → L4 → Boss. Progressive speed, density, hearts, and question hardness.
 */

export type ArcadeLevelId = "L1" | "L2" | "L3" | "L4" | "boss";

export type ArcadeDifficulty = {
  baseSpeed: number;
  speedRampCap: number;
  speedRampDiv: number;
  hearts: number;
  targetDistance: number;
  spawnGapMin: number;
  spawnGapMax: number;
  doubleChance: number;
  portalBias: number;
  questionHardness: 1 | 2 | 3;
  bossGauntlet?: { startAt: number; portalCount: number; spacing: number };
};

export type ArcadeLevelDef = {
  id: ArcadeLevelId;
  label: string;
  blurb: string;
  isBoss: boolean;
  difficulty: ArcadeDifficulty;
};

/** Correct gates needed on a level to unlock the next (even without finishing the track). */
export const ARCADE_GATES_TO_UNLOCK = 7;

export const ARCADE_LEVELS: ArcadeLevelDef[] = [
  {
    id: "L1",
    label: "Level 1",
    blurb: "Learn the rhythm — gentle speed, room to jump.",
    isBoss: false,
    difficulty: {
      baseSpeed: 240,
      speedRampCap: 80,
      speedRampDiv: 50,
      hearts: 3,
      targetDistance: 3200,
      spawnGapMin: 220,
      spawnGapMax: 200,
      doubleChance: 0.18,
      portalBias: 0.22,
      questionHardness: 1,
    },
  },
  {
    id: "L2",
    label: "Level 2",
    blurb: "Faster scroll and tighter gaps.",
    isBoss: false,
    difficulty: {
      baseSpeed: 270,
      speedRampCap: 110,
      speedRampDiv: 40,
      hearts: 3,
      targetDistance: 3600,
      spawnGapMin: 190,
      spawnGapMax: 160,
      doubleChance: 0.28,
      portalBias: 0.24,
      questionHardness: 1,
    },
  },
  {
    id: "L3",
    label: "Level 3",
    blurb: "Harder gates and denser spikes.",
    isBoss: false,
    difficulty: {
      baseSpeed: 300,
      speedRampCap: 130,
      speedRampDiv: 35,
      hearts: 3,
      targetDistance: 4000,
      spawnGapMin: 165,
      spawnGapMax: 140,
      doubleChance: 0.34,
      portalBias: 0.26,
      questionHardness: 2,
    },
  },
  {
    id: "L4",
    label: "Level 4",
    blurb: "Two hearts. Stay sharp — boss is next.",
    isBoss: false,
    difficulty: {
      baseSpeed: 330,
      speedRampCap: 150,
      speedRampDiv: 30,
      hearts: 2,
      targetDistance: 4400,
      spawnGapMin: 145,
      spawnGapMax: 120,
      doubleChance: 0.4,
      portalBias: 0.28,
      questionHardness: 2,
    },
  },
  {
    id: "boss",
    label: "Boss",
    blurb: "Gauntlet of hard portals — beat it to clear the campaign.",
    isBoss: true,
    difficulty: {
      baseSpeed: 310,
      speedRampCap: 160,
      speedRampDiv: 28,
      hearts: 2,
      targetDistance: 3800,
      spawnGapMin: 150,
      spawnGapMax: 110,
      doubleChance: 0.36,
      portalBias: 0.18,
      questionHardness: 3,
      bossGauntlet: { startAt: 2200, portalCount: 5, spacing: 280 },
    },
  },
];

export function levelById(id: ArcadeLevelId): ArcadeLevelDef {
  return ARCADE_LEVELS.find((l) => l.id === id) ?? ARCADE_LEVELS[0]!;
}

export function levelIndex(id: ArcadeLevelId): number {
  return Math.max(0, ARCADE_LEVELS.findIndex((l) => l.id === id));
}

export function nextLevelId(id: ArcadeLevelId): ArcadeLevelId | null {
  const i = levelIndex(id);
  const next = ARCADE_LEVELS[i + 1];
  return next?.id ?? null;
}

export function bossLevel(): ArcadeLevelDef {
  return ARCADE_LEVELS[ARCADE_LEVELS.length - 1]!;
}
