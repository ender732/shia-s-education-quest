/** Shared Arcade types — dash campaign across student subjects. */

export type ArcadeSubjectKey = "math" | "ela" | "science" | "social" | "reading";

export type ArcadeTheme = {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundLine: string;
  player: string;
  playerGlow: string;
  obstacle: string;
  spike: string;
  portal: string;
  orb: string;
  accentLabel: string;
  /** Hub / HUD UI accent (CSS color). Distinct per subject family. */
  uiAccent: string;
  /** Soft fill behind hub chips. */
  uiAccentSoft: string;
};

/** Intensify a mode theme for boss runs — keeps subject identity, not a shared amber world. */
export function intensifyBossTheme(theme: ArcadeTheme): ArcadeTheme {
  return {
    ...theme,
    skyTop: darkenHex(theme.skyTop, 0.35),
    skyBottom: darkenHex(theme.skyBottom, 0.2),
    ground: darkenHex(theme.ground, 0.25),
    groundLine: theme.player,
    player: theme.portal,
    playerGlow: theme.playerGlow,
    portal: theme.groundLine,
    orb: theme.player,
    spike: theme.spike,
    obstacle: darkenHex(theme.obstacle, 0.15),
    accentLabel: `${theme.accentLabel} Boss`,
  };
}

function darkenHex(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const n = Number.parseInt(raw, 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export type ArcadeChoiceQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  tip: string;
};

export type ArcadeMode = {
  id: string;
  title: string;
  blurb: string;
  /** Unit tags that prefer this mode when incomplete. */
  unitTags: string[];
  theme: ArcadeTheme;
  /** All modes share the dash engine for now. */
  engine: "dash";
  playable: boolean;
};

export type ArcadeSubjectDef = {
  key: ArcadeSubjectKey;
  /** Exact subjects.title from DB (or aliases). */
  titles: string[];
  hubTitle: string;
  campaignTitle: string;
  description: string;
  /** CSS accent token: math | ela | science | social | reading */
  accent: ArcadeSubjectKey;
  unitPrefix: string;
  defaultModeId: string;
  modes: ArcadeMode[];
  questionsForMode: (modeId: string, hardness: 1 | 2 | 3) => ArcadeChoiceQuestion[];
};
