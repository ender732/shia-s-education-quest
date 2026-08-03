export const XP_PER_LEVEL = 500;

export function levelForXp(xp: number) {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: number) {
  const into = Math.max(0, xp) % XP_PER_LEVEL;
  return {
    into,
    needed: XP_PER_LEVEL,
    percent: Math.round((into / XP_PER_LEVEL) * 100),
  };
}

/** Kid-friendly titles that rotate as levels climb. */
const LEVEL_TITLES = [
  "Quest Beginner",
  "Curious Explorer",
  "Skill Scout",
  "Practice Pro",
  "Lesson Legend",
  "Streak Star",
  "Brain Builder",
  "Focus Champion",
  "Knowledge Knight",
  "Master Scholar",
  "Quest Hero",
  "District Dynamo",
];

export function titleForLevel(level: number): string {
  const safe = Math.max(1, Math.floor(level));
  if (safe <= LEVEL_TITLES.length) return LEVEL_TITLES[safe - 1]!;
  return `Quest Hero · Rank ${safe}`;
}

/**
 * Catalog key for a level's title, so the UI can localize it. Levels past the
 * named list share one key that takes a `{level}` variable.
 */
export function levelTitleKey(level: number): string {
  const safe = Math.max(1, Math.floor(level));
  return safe <= LEVEL_TITLES.length
    ? `gamification.levelTitles.${safe}`
    : "gamification.levelTitles.beyond";
}

export type LevelUpInfo = {
  fromLevel: number;
  toLevel: number;
  previousXp: number;
  newXp: number;
  xpGained: number;
  title: string;
};

/** Returns level-up details when awarded XP crosses one or more level thresholds. */
export function detectLevelUp(
  previousXp: number,
  xpGained: number,
): LevelUpInfo | null {
  if (xpGained <= 0) return null;
  const prev = Math.max(0, previousXp);
  const newXp = prev + xpGained;
  const fromLevel = levelForXp(prev);
  const toLevel = levelForXp(newXp);
  if (toLevel <= fromLevel) return null;
  return {
    fromLevel,
    toLevel,
    previousXp: prev,
    newXp,
    xpGained,
    title: titleForLevel(toLevel),
  };
}

export const SUBJECT_ACCENTS: Record<string, string> = {
  Math: "math",
  "ELA / Reading": "ela",
  "Science (NYSSLS)": "science",
  "Social Studies (Western Hemisphere)": "social",
  "Assigned Reading": "reading",
};

export function accentFor(title: string) {
  return SUBJECT_ACCENTS[title] ?? "primary";
}
