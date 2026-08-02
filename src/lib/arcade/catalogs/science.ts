/** Science Arcade — green / lime family. */

import { mcFromBank, shuffle, type StaticMcItem } from "@/lib/arcade/questions";
import type { ArcadeChoiceQuestion, ArcadeMode, ArcadeTheme } from "@/lib/arcade/types";

const LIME: ArcadeTheme = {
  skyTop: "#0a1f12",
  skyBottom: "#14532d",
  ground: "#166534",
  groundLine: "#84cc16",
  player: "#a3e635",
  playerGlow: "rgba(132, 204, 22, 0.55)",
  obstacle: "#3f6b4a",
  spike: "#f97316",
  portal: "#fde047",
  orb: "#4ade80",
  accentLabel: "Matter",
  uiAccent: "#84cc16",
  uiAccentSoft: "rgba(132, 204, 22, 0.15)",
};

const GREEN_ECO: ArcadeTheme = {
  ...LIME,
  skyTop: "#052e16",
  skyBottom: "#15803d",
  groundLine: "#4ade80",
  player: "#86efac",
  portal: "#bef264",
  accentLabel: "Ecosystem",
};

const GREEN_EARTH: ArcadeTheme = {
  ...LIME,
  skyTop: "#0c1f14",
  skyBottom: "#166534",
  groundLine: "#22c55e",
  player: "#4ade80",
  accentLabel: "Earth",
};

const GREEN_STAR: ArcadeTheme = {
  ...LIME,
  skyTop: "#071a10",
  skyBottom: "#14532d",
  groundLine: "#a3e635",
  player: "#bef264",
  portal: "#facc15",
  orb: "#86efac",
  accentLabel: "Stars",
};

const GREEN_FORCE: ArcadeTheme = {
  ...LIME,
  skyTop: "#0a2418",
  skyBottom: "#15803d",
  groundLine: "#65a30d",
  player: "#84cc16",
  accentLabel: "Forces",
};

export const SCIENCE_MODES: ArcadeMode[] = [
  {
    id: "matter-dash",
    title: "Matter Dash",
    blurb: "Properties of matter and conservation checks in the green zone.",
    unitTags: ["187_SCI_MATTER", "187_SCI_MASS"],
    theme: LIME,
    engine: "dash",
    playable: true,
  },
  {
    id: "ecosystem-escape",
    title: "Ecosystem Escape",
    blurb: "Producers, consumers, and decomposers fuel your run.",
    unitTags: ["187_SCI_ECOSYSTEMS"],
    theme: GREEN_ECO,
    engine: "dash",
    playable: true,
  },
  {
    id: "sphere-sprint",
    title: "Sphere Sprint",
    blurb: "Geosphere, hydrosphere, atmosphere, biosphere portals.",
    unitTags: ["187_SCI_SPHERES", "187_SCI_WATER"],
    theme: GREEN_EARTH,
    engine: "dash",
    playable: true,
  },
  {
    id: "starlight-surge",
    title: "Starlight Surge",
    blurb: "Stars, distance, and brightness between lime gates.",
    unitTags: ["187_SCI_STARS"],
    theme: GREEN_STAR,
    engine: "dash",
    playable: true,
  },
  {
    id: "force-field",
    title: "Force Field",
    blurb: "Pushes, pulls, and motion sense at speed.",
    unitTags: ["187_SCI_MATTER"],
    theme: GREEN_FORCE,
    engine: "dash",
    playable: true,
  },
];

const MATTER: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "Matter is anything that has…", answer: "Mass and takes up space", wrong: ["Only color", "Only sound", "No weight ever"], tip: "Mass + volume = matter." },
    { prompt: "Ice melting into water is a…", answer: "Change of state", wrong: ["New element", "Lost atoms", "Gravity reverse"], tip: "Solid → liquid = state change." },
  ],
  mid: [
    { prompt: "Conservation of mass means…", answer: "Mass stays the same in a closed system", wrong: ["Mass always doubles", "Mass disappears", "Mass becomes light only"], tip: "Atoms rearrange; mass holds." },
    { prompt: "A measurable property of matter is…", answer: "Mass or volume", wrong: ["Happiness", "Luck", "A nickname"], tip: "Measurable = tools can check it." },
  ],
  hard: [
    { prompt: "Mixing vinegar and baking soda in an open cup may seem to lose mass because…", answer: "Gas escapes into the air", wrong: ["Atoms vanish", "Gravity paused", "Color changed mass"], tip: "Trap the gas → mass conserved." },
    { prompt: "Particles in a solid…", answer: "Vibrate in fixed positions", wrong: ["Fly freely like gas only", "Disappear at night", "Have no mass"], tip: "Solids keep shape; particles vibrate." },
    { prompt: "Density compares…", answer: "Mass to volume", wrong: ["Color to sound", "Time to speed", "Taste to smell"], tip: "Density = mass ÷ volume." },
  ],
};

const ECO: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "A producer…", answer: "Makes its own food (often from sunlight)", wrong: ["Only eats meat", "Never needs energy", "Is always a rock"], tip: "Plants are producers." },
    { prompt: "A consumer…", answer: "Eats other organisms for energy", wrong: ["Makes sunlight", "Is only water", "Never moves energy"], tip: "Animals are consumers." },
  ],
  mid: [
    { prompt: "Decomposers…", answer: "Break down dead matter and recycle nutrients", wrong: ["Create brand-new planets", "Stop all food webs", "Only eat metal"], tip: "Fungi/bacteria recycle." },
    { prompt: "In a food chain, energy mostly starts from…", answer: "The Sun", wrong: ["The Moon only", "Plastic", "Echoes"], tip: "Sun → producers → consumers." },
  ],
  hard: [
    { prompt: "Matter cycles in ecosystems while energy…", answer: "Flows and is used up along the way", wrong: ["Never moves", "Only stays in rocks", "Deletes producers"], tip: "Matter cycles; energy flows." },
    { prompt: "If producers disappear, consumers…", answer: "Lose their energy source over time", wrong: ["Gain infinite energy", "Become stars", "Stop needing food"], tip: "Food webs need producers." },
    { prompt: "A herbivore eats…", answer: "Mostly plants", wrong: ["Only metals", "Only other carnivores always", "Only clouds"], tip: "Herbivore = plant eater." },
  ],
};

const EARTH: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "The hydrosphere is mostly…", answer: "Earth's water", wrong: ["Only rocks", "Only air", "Only living things"], tip: "Hydro → water." },
    { prompt: "The atmosphere is…", answer: "The layer of air around Earth", wrong: ["Only the core", "Only oceans", "Only soil"], tip: "Atmosphere = air." },
  ],
  mid: [
    { prompt: "Geosphere includes…", answer: "Rocks, soil, and Earth's land materials", wrong: ["Only birds", "Only rain", "Only Wi‑Fi"], tip: "Geo → Earth materials." },
    { prompt: "Biosphere includes…", answer: "All living things", wrong: ["Only empty space", "Only lava", "Only dictionaries"], tip: "Bio → life." },
  ],
  hard: [
    { prompt: "Most of Earth's water is…", answer: "Salt water in oceans", wrong: ["Only in clouds as ice forever", "Only in bathtubs", "Fresh lakes only"], tip: "Oceans hold most water." },
    { prompt: "Spheres interact when…", answer: "Water rains on land and helps plants grow", wrong: ["They never touch", "Earth has no air", "Rocks ignore water always"], tip: "Rain links hydro + geo + bio." },
    { prompt: "Fresh water is found in…", answer: "Rivers, lakes, ice, and groundwater", wrong: ["Only the Sun", "Only magma", "Only outer space"], tip: "Fresh sources are limited." },
  ],
};

const STARS: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "The Sun is a…", answer: "Star", wrong: ["Planet only", "Comet only", "Moon only"], tip: "Our star = the Sun." },
    { prompt: "Stars look tiny because they are…", answer: "Very far away", wrong: ["Always the size of ants", "Painted on the sky", "Made of paper"], tip: "Distance shrinks appearance." },
  ],
  mid: [
    { prompt: "A star can look brighter because it is…", answer: "Closer or truly more luminous", wrong: ["Always smaller", "Always colder", "Always silent"], tip: "Brightness depends on distance + power." },
    { prompt: "Apparent brightness means…", answer: "How bright a star looks from Earth", wrong: ["Its exact mass only", "Its favorite color word", "Its age in days only"], tip: "Apparent = how it appears." },
  ],
  hard: [
    { prompt: "Two stars with equal true brightness: the farther one looks…", answer: "Dimmer", wrong: ["Always brighter", "Exactly the same forever", "Invisible always"], tip: "Farther → dimmer appearance." },
    { prompt: "Stars give off…", answer: "Light and energy", wrong: ["Only shadows", "Only soil", "Only maps"], tip: "Stars radiate energy." },
    { prompt: "Night-sky patterns of stars are often called…", answer: "Constellations", wrong: ["Food webs", "Decimals", "Root words"], tip: "Constellations = star patterns." },
  ],
};

const FORCE: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "A push or a pull is a…", answer: "Force", wrong: ["Noun phrase only", "Planet name", "Fraction"], tip: "Force = push or pull." },
    { prompt: "Gravity pulls objects…", answer: "Toward Earth", wrong: ["Only sideways forever", "Into dictionaries", "Away from mass always"], tip: "Gravity attracts toward Earth." },
  ],
  mid: [
    { prompt: "Friction usually…", answer: "Slows objects that rub together", wrong: ["Creates new planets", "Deletes mass", "Stops all light"], tip: "Rubbing surfaces resist motion." },
    { prompt: "If forces are balanced, an object…", answer: "Keeps its motion (rest or steady)", wrong: ["Must explode", "Must change color", "Must double mass"], tip: "Balanced forces → no change in motion." },
  ],
  hard: [
    { prompt: "Unbalanced forces cause…", answer: "A change in motion", wrong: ["A new language", "A lost atmosphere always", "Instant invisibility"], tip: "Net force changes motion." },
    { prompt: "More mass usually means…", answer: "Harder to speed up or slow down", wrong: ["No gravity ever", "No forces apply", "Always floats up"], tip: "Inertia grows with mass." },
    { prompt: "A ball rolling to a stop on grass is slowed by…", answer: "Friction", wrong: ["A synonym", "A chapter title", "A root word"], tip: "Grass rubs → friction." },
  ],
};

const BANKS: Record<string, (h: 1 | 2 | 3) => ArcadeChoiceQuestion[]> = {
  "matter-dash": (h) => mcFromBank("matter", h, MATTER.easy, MATTER.mid, MATTER.hard),
  "ecosystem-escape": (h) => mcFromBank("eco", h, ECO.easy, ECO.mid, ECO.hard),
  "sphere-sprint": (h) => mcFromBank("earth", h, EARTH.easy, EARTH.mid, EARTH.hard),
  "starlight-surge": (h) => mcFromBank("stars", h, STARS.easy, STARS.mid, STARS.hard),
  "force-field": (h) => mcFromBank("force", h, FORCE.easy, FORCE.mid, FORCE.hard),
};

export function scienceQuestionsForMode(modeId: string, hardness: 1 | 2 | 3): ArcadeChoiceQuestion[] {
  const fn = BANKS[modeId] ?? BANKS["matter-dash"]!;
  return shuffle(fn(hardness));
}
