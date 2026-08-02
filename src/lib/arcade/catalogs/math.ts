/** Math Arcade — cool teal/cyan family (topic tints stay cyan-adjacent). */

import { mcFromBank, shuffle, type StaticMcItem } from "@/lib/arcade/questions";
import type { ArcadeChoiceQuestion, ArcadeMode, ArcadeTheme } from "@/lib/arcade/types";

const TEAL: ArcadeTheme = {
  skyTop: "#0a1f2e",
  skyBottom: "#124a5c",
  ground: "#0f3545",
  groundLine: "#22d3ee",
  player: "#67e8f9",
  playerGlow: "rgba(34, 211, 238, 0.55)",
  obstacle: "#4a7080",
  spike: "#f87171",
  portal: "#fde047",
  orb: "#2dd4bf",
  accentLabel: "Number",
  uiAccent: "#22d3ee",
  uiAccentSoft: "rgba(34, 211, 238, 0.15)",
};

const TEAL_FRAC: ArcadeTheme = {
  ...TEAL,
  skyTop: "#0c2438",
  skyBottom: "#155e75",
  groundLine: "#67e8f9",
  player: "#a5f3fc",
  portal: "#facc15",
  orb: "#5eead4",
  accentLabel: "Fraction",
};

const TEAL_DEC: ArcadeTheme = {
  ...TEAL,
  skyTop: "#082f3a",
  skyBottom: "#0e7490",
  groundLine: "#2dd4bf",
  player: "#5eead4",
  accentLabel: "Decimal",
};

const TEAL_VOL: ArcadeTheme = {
  ...TEAL,
  skyTop: "#0b2a36",
  skyBottom: "#164e63",
  groundLine: "#38bdf8",
  player: "#7dd3fc",
  portal: "#fbbf24",
  accentLabel: "Volume",
};

const TEAL_POW: ArcadeTheme = {
  ...TEAL,
  skyTop: "#0a2230",
  skyBottom: "#0c4a6e",
  groundLine: "#22d3ee",
  player: "#67e8f9",
  accentLabel: "Powers",
};

export const MATH_MODES: ArcadeMode[] = [
  {
    id: "number-dash",
    title: "Number Dash",
    blurb: "Jump, time your leaps, and clear multi-digit multiplication gates.",
    unitTags: ["187_MATH_WHOLE_NUM", "187_MATH_DIV_2DIGIT"],
    theme: TEAL,
    engine: "dash",
    playable: true,
  },
  {
    id: "fraction-flight",
    title: "Fraction Flight",
    blurb: "Dash through unlike-denominator challenges without losing momentum.",
    unitTags: ["187_MATH_FRACTIONS", "187_MATH_FRAC_MULT"],
    theme: TEAL_FRAC,
    engine: "dash",
    playable: true,
  },
  {
    id: "decimal-dash",
    title: "Decimal Dash",
    blurb: "Place-value portals and hundredths ops — stay sharp at speed.",
    unitTags: ["187_MATH_DECIMALS", "187_MATH_DECIMAL_OPS"],
    theme: TEAL_DEC,
    engine: "dash",
    playable: true,
  },
  {
    id: "volume-vault",
    title: "Volume Vault",
    blurb: "Rectangular prism volume checks between spike runs.",
    unitTags: ["187_MATH_VOLUME"],
    theme: TEAL_VOL,
    engine: "dash",
    playable: true,
  },
  {
    id: "powers-pulse",
    title: "Powers Pulse",
    blurb: "Powers of 10 and place-value shifts fuel your boosts.",
    unitTags: ["187_MATH_POWERS10"],
    theme: TEAL_POW,
    engine: "dash",
    playable: true,
  },
];

function mulQuestions(hardness: 1 | 2 | 3): ArcadeChoiceQuestion[] {
  const easy: [number, number, number][] = [
    [12, 15, 180],
    [24, 16, 384],
    [35, 12, 420],
    [48, 25, 1200],
  ];
  const mid: [number, number, number][] = [
    [125, 14, 1750],
    [63, 18, 1134],
    [76, 23, 1748],
    [84, 15, 1260],
  ];
  const hard: [number, number, number][] = [
    [147, 26, 3822],
    [256, 18, 4608],
    [98, 47, 4606],
    [135, 24, 3240],
  ];
  const pairs =
    hardness === 1 ? [...easy, ...mid.slice(0, 2)] : hardness === 2 ? [...mid, ...hard.slice(0, 2)] : hard;
  return pairs.map(([a, b, ans], i) => {
    const wrong = [ans + a, ans - b, ans + 100, ans + a + b].filter((n) => n !== ans && n > 0);
    const choices = shuffle([String(ans), ...wrong.map(String)].slice(0, 4));
    return {
      id: `mul-h${hardness}-${i}`,
      prompt: `What is ${a} × ${b}?`,
      choices,
      correctIndex: choices.indexOf(String(ans)),
      tip: `Break it up: (${a} × ${Math.floor(b / 10) * 10}) + (${a} × ${b % 10}).`,
    };
  });
}

const FRAC: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "1/4 + 1/2 = ?", answer: "3/4", wrong: ["2/6", "1/6", "2/4"], tip: "1/2 = 2/4, so 1/4 + 2/4 = 3/4." },
    { prompt: "2/3 + 1/6 = ?", answer: "5/6", wrong: ["3/9", "1/2", "3/6"], tip: "2/3 = 4/6, so 4/6 + 1/6 = 5/6." },
    { prompt: "Which is greater: 3/4 or 2/3?", answer: "3/4", wrong: ["2/3", "Equal", "1/2"], tip: "3/4 = 0.75 and 2/3 ≈ 0.67." },
  ],
  mid: [
    { prompt: "3/5 − 1/10 = ?", answer: "1/2", wrong: ["2/5", "1/5", "4/10"], tip: "3/5 = 6/10, so 6/10 − 1/10 = 5/10 = 1/2." },
    { prompt: "1/2 × 3/4 = ?", answer: "3/8", wrong: ["4/6", "3/6", "1/4"], tip: "Multiply numerators and denominators: 1×3 / 2×4 = 3/8." },
    { prompt: "2/5 × 1/2 = ?", answer: "1/5", wrong: ["3/7", "2/10", "1/2"], tip: "2×1 / 5×2 = 2/10 = 1/5." },
  ],
  hard: [
    { prompt: "5/6 − 1/4 = ?", answer: "7/12", wrong: ["4/10", "1/2", "3/8"], tip: "5/6 = 10/12, 1/4 = 3/12 → 7/12." },
    { prompt: "2/3 × 3/5 = ?", answer: "2/5", wrong: ["6/8", "5/15", "1/3"], tip: "2×3 / 3×5 = 6/15 = 2/5." },
    { prompt: "3/4 + 2/5 = ?", answer: "23/20", wrong: ["5/9", "1", "6/20"], tip: "15/20 + 8/20 = 23/20." },
  ],
};

const DEC: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "Which digit is in the hundredths place of 3.476?", answer: "7", wrong: ["4", "6", "3"], tip: "Tenths = 4, hundredths = 7, thousandths = 6." },
    { prompt: "0.6 + 0.25 = ?", answer: "0.85", wrong: ["0.8", "0.9", "0.35"], tip: "Line up decimals: 0.60 + 0.25 = 0.85." },
    { prompt: "Which is greatest: 0.45, 0.5, 0.405?", answer: "0.5", wrong: ["0.45", "0.405", "Equal"], tip: "0.5 = 0.500, which beats 0.45 and 0.405." },
  ],
  mid: [
    { prompt: "1.4 × 0.5 = ?", answer: "0.7", wrong: ["0.9", "1.9", "0.07"], tip: "Half of 1.4 is 0.7." },
    { prompt: "3.20 − 1.75 = ?", answer: "1.45", wrong: ["1.55", "2.45", "1.35"], tip: "Borrow carefully: 3.20 − 1.75 = 1.45." },
  ],
  hard: [
    { prompt: "2.45 × 0.2 = ?", answer: "0.49", wrong: ["0.4900", "4.9", "0.245"], tip: "2.45 × 1/5 = 0.49." },
    { prompt: "5.06 − 2.78 = ?", answer: "2.28", wrong: ["2.38", "3.28", "2.18"], tip: "Borrow from the ones: 5.06 − 2.78 = 2.28." },
    { prompt: "0.125 × 8 = ?", answer: "1", wrong: ["0.8", "10", "0.1"], tip: "0.125 is 1/8, so × 8 = 1." },
  ],
};

const VOL: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "Volume of a 3 × 4 × 5 rectangular prism?", answer: "60", wrong: ["12", "45", "20"], tip: "V = l × w × h = 3 × 4 × 5 = 60." },
    { prompt: "A box is 2 × 6 × 8. What is its volume?", answer: "96", wrong: ["16", "48", "64"], tip: "2 × 6 × 8 = 96 cubic units." },
  ],
  mid: [
    { prompt: "If V = 72 and base is 8 × 3, what is the height?", answer: "3", wrong: ["6", "9", "4"], tip: "Height = V ÷ (l × w) = 72 ÷ 24 = 3." },
    { prompt: "Unit cubes in a 5 × 5 × 2 prism?", answer: "50", wrong: ["25", "10", "100"], tip: "5 × 5 × 2 = 50 unit cubes." },
  ],
  hard: [
    { prompt: "A 9 × 4 × 7 prism has volume?", answer: "252", wrong: ["63", "36", "280"], tip: "9 × 4 × 7 = 252." },
    { prompt: "V = 240, base 10 × 6. Height?", answer: "4", wrong: ["5", "8", "24"], tip: "240 ÷ 60 = 4." },
    { prompt: "Two 3 × 3 × 3 cubes stacked: total volume?", answer: "54", wrong: ["27", "18", "81"], tip: "Each cube is 27; two make 54." },
  ],
};

const POW: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "10³ = ?", answer: "1,000", wrong: ["100", "10,000", "30"], tip: "10³ = 10 × 10 × 10 = 1,000." },
    { prompt: "830 ÷ 10 = ?", answer: "83", wrong: ["8.3", "8300", "813"], tip: "Dividing by 10 shifts one place left." },
  ],
  mid: [
    { prompt: "4.7 × 10² = ?", answer: "470", wrong: ["47", "4,700", "0.47"], tip: "Move the decimal 2 places right: 470." },
    { prompt: "6 × 10⁴ = ?", answer: "60,000", wrong: ["600", "6,000", "600,000"], tip: "4 zeros after 6 → 60,000." },
  ],
  hard: [
    { prompt: "3.25 × 10³ = ?", answer: "3,250", wrong: ["325", "32,500", "0.325"], tip: "Move decimal 3 places right." },
    { prompt: "10⁵ ÷ 10² = ?", answer: "1,000", wrong: ["10", "100", "10,000"], tip: "Subtract exponents: 10³ = 1,000." },
    { prompt: "0.56 × 10² = ?", answer: "56", wrong: ["5.6", "560", "0.056"], tip: "Two places right → 56." },
  ],
};

const BANKS: Record<string, (h: 1 | 2 | 3) => ArcadeChoiceQuestion[]> = {
  "number-dash": mulQuestions,
  "fraction-flight": (h) => mcFromBank("frac", h, FRAC.easy, FRAC.mid, FRAC.hard),
  "decimal-dash": (h) => mcFromBank("dec", h, DEC.easy, DEC.mid, DEC.hard),
  "volume-vault": (h) => mcFromBank("vol", h, VOL.easy, VOL.mid, VOL.hard),
  "powers-pulse": (h) => mcFromBank("pow", h, POW.easy, POW.mid, POW.hard),
};

export function mathQuestionsForMode(modeId: string, hardness: 1 | 2 | 3): ArcadeChoiceQuestion[] {
  const fn = BANKS[modeId] ?? BANKS["number-dash"]!;
  return shuffle(fn(hardness));
}
