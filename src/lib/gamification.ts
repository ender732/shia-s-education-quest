export const XP_PER_LEVEL = 500;

export function levelForXp(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: number) {
  const into = xp % XP_PER_LEVEL;
  return {
    into,
    needed: XP_PER_LEVEL,
    percent: Math.round((into / XP_PER_LEVEL) * 100),
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
