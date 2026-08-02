/**
 * Math Arcade — topic catalog, question banks, and unit → game resolution.
 * Extension point: add a MathArcadeMode entry + question bank (and optionally a
 * dedicated component) to ship new subject/topic games later.
 */

export type MathArcadeModeId =
  | "number-dash"
  | "fraction-flight"
  | "decimal-dash"
  | "volume-vault"
  | "powers-pulse";

export type MathArcadeTheme = {
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
};

export type ArcadeChoiceQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  tip: string;
};

export type MathArcadeMode = {
  id: MathArcadeModeId;
  title: string;
  blurb: string;
  /** Unit tags that prefer this mode when incomplete. */
  unitTags: string[];
  theme: MathArcadeTheme;
  /** Prototype status — all current modes share Number Dash engine. */
  engine: "number-dash";
  playable: boolean;
};

const THEME_SKY: MathArcadeTheme = {
  skyTop: "#0f1a2e",
  skyBottom: "#1a3358",
  ground: "#1e3a5f",
  groundLine: "#38bdf8",
  player: "#38bdf8",
  playerGlow: "rgba(56, 189, 248, 0.55)",
  obstacle: "#64748b",
  spike: "#f87171",
  portal: "#fbbf24",
  orb: "#34d399",
  accentLabel: "Number",
};

const THEME_FRAC: MathArcadeTheme = {
  skyTop: "#1a1430",
  skyBottom: "#2d1f4e",
  ground: "#2a2048",
  groundLine: "#a78bfa",
  player: "#c4b5fd",
  playerGlow: "rgba(167, 139, 250, 0.55)",
  obstacle: "#7c6a9e",
  spike: "#fb7185",
  portal: "#fbbf24",
  orb: "#f0abfc",
  accentLabel: "Fraction",
};

const THEME_DEC: MathArcadeTheme = {
  skyTop: "#0c221c",
  skyBottom: "#164036",
  ground: "#1a3d34",
  groundLine: "#34d399",
  player: "#6ee7b7",
  playerGlow: "rgba(52, 211, 153, 0.55)",
  obstacle: "#4a7a6c",
  spike: "#fb923c",
  portal: "#fbbf24",
  orb: "#5eead4",
  accentLabel: "Decimal",
};

const THEME_VOL: MathArcadeTheme = {
  skyTop: "#1c1508",
  skyBottom: "#3d2e12",
  ground: "#3a2f18",
  groundLine: "#fbbf24",
  player: "#fcd34d",
  playerGlow: "rgba(251, 191, 36, 0.55)",
  obstacle: "#8b7355",
  spike: "#f87171",
  portal: "#38bdf8",
  orb: "#fde68a",
  accentLabel: "Volume",
};

const THEME_POW: MathArcadeTheme = {
  skyTop: "#0a1628",
  skyBottom: "#1e3a5c",
  ground: "#1a2f4a",
  groundLine: "#60a5fa",
  player: "#93c5fd",
  playerGlow: "rgba(96, 165, 250, 0.55)",
  obstacle: "#4b6a8a",
  spike: "#f472b6",
  portal: "#fbbf24",
  orb: "#7dd3fc",
  accentLabel: "Powers",
};

/** Catalog of math mini-game modes (Math only for now). */
export const MATH_ARCADE_MODES: MathArcadeMode[] = [
  {
    id: "number-dash",
    title: "Number Dash",
    blurb: "Jump, time your leaps, and clear multi-digit multiplication gates.",
    unitTags: ["187_MATH_WHOLE_NUM", "187_MATH_DIV_2DIGIT"],
    theme: THEME_SKY,
    engine: "number-dash",
    playable: true,
  },
  {
    id: "fraction-flight",
    title: "Fraction Flight",
    blurb: "Dash through unlike-denominator challenges without losing momentum.",
    unitTags: ["187_MATH_FRACTIONS", "187_MATH_FRAC_MULT"],
    theme: THEME_FRAC,
    engine: "number-dash",
    playable: true,
  },
  {
    id: "decimal-dash",
    title: "Decimal Dash",
    blurb: "Place-value portals and hundredths ops — stay sharp at speed.",
    unitTags: ["187_MATH_DECIMALS", "187_MATH_DECIMAL_OPS"],
    theme: THEME_DEC,
    engine: "number-dash",
    playable: true,
  },
  {
    id: "volume-vault",
    title: "Volume Vault",
    blurb: "Rectangular prism volume checks between spike runs.",
    unitTags: ["187_MATH_VOLUME"],
    theme: THEME_VOL,
    engine: "number-dash",
    playable: true,
  },
  {
    id: "powers-pulse",
    title: "Powers Pulse",
    blurb: "Powers of 10 and place-value shifts fuel your boosts.",
    unitTags: ["187_MATH_POWERS10"],
    theme: THEME_POW,
    engine: "number-dash",
    playable: true,
  },
];

export function modeById(id: MathArcadeModeId): MathArcadeMode {
  return MATH_ARCADE_MODES.find((m) => m.id === id) ?? MATH_ARCADE_MODES[0]!;
}

export function modeForUnitTag(unitTag: string | null | undefined): MathArcadeMode {
  if (!unitTag) return modeById("number-dash");
  const match = MATH_ARCADE_MODES.find((m) => m.unitTags.includes(unitTag));
  return match ?? modeById("number-dash");
}

/**
 * Prefer incomplete math unit tasks; else any math unit; else default Number Dash.
 */
export function pickRecommendedMode(
  tasks: Array<{ id: string; unit_tag?: string | null }>,
  masteredIds: Set<string>,
): { mode: MathArcadeMode; reason: string; unitTag: string | null } {
  const mathTasks = tasks.filter((t) => t.unit_tag?.startsWith("187_MATH"));
  const incomplete = mathTasks.find((t) => t.unit_tag && !masteredIds.has(t.id));
  if (incomplete?.unit_tag) {
    const mode = modeForUnitTag(incomplete.unit_tag);
    return {
      mode,
      unitTag: incomplete.unit_tag,
      reason: `Matched to your open unit · ${mode.title}`,
    };
  }
  const any = mathTasks.find((t) => t.unit_tag);
  if (any?.unit_tag) {
    const mode = modeForUnitTag(any.unit_tag);
    return {
      mode,
      unitTag: any.unit_tag,
      reason: `Based on your Math unit · ${mode.title}`,
    };
  }
  return {
    mode: modeById("number-dash"),
    unitTag: null,
    reason: "Default Math dash — practice while you wait for assignments",
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function mulQuestions(): ArcadeChoiceQuestion[] {
  const pairs: [number, number, number][] = [
    [12, 15, 180],
    [24, 16, 384],
    [35, 12, 420],
    [48, 25, 1200],
    [125, 14, 1750],
    [63, 18, 1134],
    [76, 23, 1748],
    [84, 15, 1260],
  ];
  return pairs.map(([a, b, ans], i) => {
    const wrong = [ans + a, ans - b, ans + 100].filter((n) => n !== ans);
    const choices = shuffle([String(ans), ...wrong.map(String)].slice(0, 4));
    return {
      id: `mul-${i}`,
      prompt: `What is ${a} × ${b}?`,
      choices,
      correctIndex: choices.indexOf(String(ans)),
      tip: `Break it up: (${a} × ${Math.floor(b / 10) * 10}) + (${a} × ${b % 10}).`,
    };
  });
}

function fractionQuestions(): ArcadeChoiceQuestion[] {
  const items: { prompt: string; answer: string; wrong: string[]; tip: string }[] = [
    {
      prompt: "1/4 + 1/2 = ?",
      answer: "3/4",
      wrong: ["2/6", "1/6", "2/4"],
      tip: "1/2 = 2/4, so 1/4 + 2/4 = 3/4.",
    },
    {
      prompt: "2/3 + 1/6 = ?",
      answer: "5/6",
      wrong: ["3/9", "1/2", "3/6"],
      tip: "2/3 = 4/6, so 4/6 + 1/6 = 5/6.",
    },
    {
      prompt: "3/5 − 1/10 = ?",
      answer: "1/2",
      wrong: ["2/5", "1/5", "4/10"],
      tip: "3/5 = 6/10, so 6/10 − 1/10 = 5/10 = 1/2.",
    },
    {
      prompt: "Which is greater: 3/4 or 2/3?",
      answer: "3/4",
      wrong: ["2/3", "Equal", "1/2"],
      tip: "3/4 = 0.75 and 2/3 ≈ 0.67.",
    },
    {
      prompt: "1/2 × 3/4 = ?",
      answer: "3/8",
      wrong: ["4/6", "3/6", "1/4"],
      tip: "Multiply numerators and denominators: 1×3 / 2×4 = 3/8.",
    },
    {
      prompt: "2/5 × 1/2 = ?",
      answer: "1/5",
      wrong: ["3/7", "2/10", "1/2"],
      tip: "2×1 / 5×2 = 2/10 = 1/5.",
    },
  ];
  return items.map((item, i) => {
    const choices = shuffle([item.answer, ...item.wrong]);
    return {
      id: `frac-${i}`,
      prompt: item.prompt,
      choices,
      correctIndex: choices.indexOf(item.answer),
      tip: item.tip,
    };
  });
}

function decimalQuestions(): ArcadeChoiceQuestion[] {
  const items: { prompt: string; answer: string; wrong: string[]; tip: string }[] = [
    {
      prompt: "Which digit is in the hundredths place of 3.476?",
      answer: "7",
      wrong: ["4", "6", "3"],
      tip: "Tenths = 4, hundredths = 7, thousandths = 6.",
    },
    {
      prompt: "0.6 + 0.25 = ?",
      answer: "0.85",
      wrong: ["0.8", "0.9", "0.35"],
      tip: "Line up decimals: 0.60 + 0.25 = 0.85.",
    },
    {
      prompt: "1.4 × 0.5 = ?",
      answer: "0.7",
      wrong: ["0.9", "1.9", "0.07"],
      tip: "Half of 1.4 is 0.7.",
    },
    {
      prompt: "3.20 − 1.75 = ?",
      answer: "1.45",
      wrong: ["1.55", "2.45", "1.35"],
      tip: "Borrow carefully: 3.20 − 1.75 = 1.45.",
    },
    {
      prompt: "Which is greatest: 0.45, 0.5, 0.405?",
      answer: "0.5",
      wrong: ["0.45", "0.405", "Equal"],
      tip: "0.5 = 0.500, which beats 0.45 and 0.405.",
    },
  ];
  return items.map((item, i) => {
    const choices = shuffle([item.answer, ...item.wrong]);
    return {
      id: `dec-${i}`,
      prompt: item.prompt,
      choices,
      correctIndex: choices.indexOf(item.answer),
      tip: item.tip,
    };
  });
}

function volumeQuestions(): ArcadeChoiceQuestion[] {
  const items: { prompt: string; answer: string; wrong: string[]; tip: string }[] = [
    {
      prompt: "Volume of a 3 × 4 × 5 rectangular prism?",
      answer: "60",
      wrong: ["12", "45", "20"],
      tip: "V = l × w × h = 3 × 4 × 5 = 60.",
    },
    {
      prompt: "A box is 2 × 6 × 8. What is its volume?",
      answer: "96",
      wrong: ["16", "48", "64"],
      tip: "2 × 6 × 8 = 96 cubic units.",
    },
    {
      prompt: "If V = 72 and base is 8 × 3, what is the height?",
      answer: "3",
      wrong: ["6", "9", "4"],
      tip: "Height = V ÷ (l × w) = 72 ÷ 24 = 3.",
    },
    {
      prompt: "Unit cubes in a 5 × 5 × 2 prism?",
      answer: "50",
      wrong: ["25", "10", "100"],
      tip: "5 × 5 × 2 = 50 unit cubes.",
    },
  ];
  return items.map((item, i) => {
    const choices = shuffle([item.answer, ...item.wrong]);
    return {
      id: `vol-${i}`,
      prompt: item.prompt,
      choices,
      correctIndex: choices.indexOf(item.answer),
      tip: item.tip,
    };
  });
}

function powersQuestions(): ArcadeChoiceQuestion[] {
  const items: { prompt: string; answer: string; wrong: string[]; tip: string }[] = [
    {
      prompt: "10³ = ?",
      answer: "1,000",
      wrong: ["100", "10,000", "30"],
      tip: "10³ = 10 × 10 × 10 = 1,000.",
    },
    {
      prompt: "4.7 × 10² = ?",
      answer: "470",
      wrong: ["47", "4,700", "0.47"],
      tip: "Move the decimal 2 places right: 470.",
    },
    {
      prompt: "830 ÷ 10 = ?",
      answer: "83",
      wrong: ["8.3", "8300", "813"],
      tip: "Dividing by 10 shifts one place left.",
    },
    {
      prompt: "6 × 10⁴ = ?",
      answer: "60,000",
      wrong: ["600", "6,000", "600,000"],
      tip: "4 zeros after 6 → 60,000.",
    },
  ];
  return items.map((item, i) => {
    const choices = shuffle([item.answer, ...item.wrong]);
    return {
      id: `pow-${i}`,
      prompt: item.prompt,
      choices,
      correctIndex: choices.indexOf(item.answer),
      tip: item.tip,
    };
  });
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

const BANKS: Record<MathArcadeModeId, () => ArcadeChoiceQuestion[]> = {
  "number-dash": mulQuestions,
  "fraction-flight": fractionQuestions,
  "decimal-dash": decimalQuestions,
  "volume-vault": volumeQuestions,
  "powers-pulse": powersQuestions,
};

/** Fresh shuffled question deck for a mode (reused across a run). */
export function questionsForMode(modeId: MathArcadeModeId): ArcadeChoiceQuestion[] {
  return shuffle(BANKS[modeId]());
}

export function nextQuestion(
  deck: ArcadeChoiceQuestion[],
  usedIds: Set<string>,
): ArcadeChoiceQuestion {
  const unused = deck.filter((q) => !usedIds.has(q.id));
  if (unused.length > 0) return pick(unused);
  return pick(deck);
}

/** Soft practice bonus — not wired to profile XP yet (avoid mastery conflicts). */
export function starsForRun(score: number, corrects: number, deaths: number): 1 | 2 | 3 {
  if (corrects >= 4 && deaths === 0 && score >= 1200) return 3;
  if (corrects >= 2 && score >= 600) return 2;
  return 1;
}

/** TODO: optional tiny XP award via profiles — keep separate from lesson mastery. */
export const MATH_ARCADE_XP_TODO =
  "Wire optional practice XP (e.g. +5–15 once/day) without touching task mastery.";
