/** Social Studies Arcade — earthy ochre / navy family. */

import { mcFromBank, shuffle, type StaticMcItem } from "@/lib/arcade/questions";
import type { ArcadeChoiceQuestion, ArcadeMode, ArcadeTheme } from "@/lib/arcade/types";

const NAVY_OCHRE: ArcadeTheme = {
  skyTop: "#0b1224",
  skyBottom: "#1e3a5f",
  ground: "#243447",
  groundLine: "#d97706",
  player: "#f59e0b",
  playerGlow: "rgba(217, 119, 6, 0.55)",
  obstacle: "#4b5568",
  spike: "#dc2626",
  portal: "#fbbf24",
  orb: "#38bdf8",
  accentLabel: "Maps",
  uiAccent: "#d97706",
  uiAccentSoft: "rgba(217, 119, 6, 0.15)",
};

const NAVY_HIST: ArcadeTheme = {
  ...NAVY_OCHRE,
  skyTop: "#0c1428",
  skyBottom: "#1e293b",
  groundLine: "#ca8a04",
  player: "#eab308",
  portal: "#f59e0b",
  orb: "#60a5fa",
  accentLabel: "History",
};

const NAVY_EXP: ArcadeTheme = {
  ...NAVY_OCHRE,
  skyTop: "#0a1020",
  skyBottom: "#172554",
  groundLine: "#f59e0b",
  player: "#fbbf24",
  accentLabel: "Explore",
};

const NAVY_CIVIC: ArcadeTheme = {
  ...NAVY_OCHRE,
  skyTop: "#0d1526",
  skyBottom: "#1e3a8a",
  groundLine: "#fb923c",
  player: "#fdba74",
  portal: "#38bdf8",
  orb: "#fbbf24",
  accentLabel: "Civics",
};

const NAVY_TODAY: ArcadeTheme = {
  ...NAVY_OCHRE,
  skyTop: "#0b1322",
  skyBottom: "#334155",
  groundLine: "#ea580c",
  player: "#fb923c",
  accentLabel: "Today",
};

export const SOCIAL_MODES: ArcadeMode[] = [
  {
    id: "map-dash",
    title: "Map Dash",
    blurb: "Western Hemisphere geography gates on a navy trail.",
    unitTags: ["187_SS_MAPS"],
    theme: NAVY_OCHRE,
    engine: "dash",
    playable: true,
  },
  {
    id: "civilization-charge",
    title: "Civilization Charge",
    blurb: "Maya, Aztec, and Inca knowledge between ochre portals.",
    unitTags: ["187_SS_HISTORY"],
    theme: NAVY_HIST,
    engine: "dash",
    playable: true,
  },
  {
    id: "exploration-run",
    title: "Exploration Run",
    blurb: "Contact, voyages, and multiple perspectives.",
    unitTags: ["187_SS_EXPLORATION"],
    theme: NAVY_EXP,
    engine: "dash",
    playable: true,
  },
  {
    id: "civics-circuit",
    title: "Civics Circuit",
    blurb: "U.S. government and citizenship checkpoints.",
    unitTags: ["187_SS_US"],
    theme: NAVY_CIVIC,
    engine: "dash",
    playable: true,
  },
  {
    id: "hemisphere-hustle",
    title: "Hemisphere Hustle",
    blurb: "Canada, Mexico, DR, and today — trade & citizenship.",
    unitTags: ["187_SS_CANADA", "187_SS_MEXICO", "187_SS_DR", "187_SS_TODAY"],
    theme: NAVY_TODAY,
    engine: "dash",
    playable: true,
  },
];

const MAPS: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "North America and South America are in the…", answer: "Western Hemisphere", wrong: ["Only Eastern Hemisphere", "Only Antarctica", "Only Asia"], tip: "Americas ≈ Western Hemisphere." },
    { prompt: "A map key (legend)…", answer: "Explains symbols on the map", wrong: ["Deletes borders", "Measures your height", "Writes novels"], tip: "Legend unlocks symbols." },
  ],
  mid: [
    { prompt: "The equator is…", answer: "An imaginary line around Earth's middle", wrong: ["A mountain range", "A river in Canada only", "A city in Mexico"], tip: "Equator divides N/S." },
    { prompt: "The Amazon is best known as a…", answer: "Major river (and rainforest region)", wrong: ["Desert only", "Ice sheet only", "Moon crater"], tip: "Amazon = river/rainforest." },
  ],
  hard: [
    { prompt: "The Andes are…", answer: "A major mountain range in South America", wrong: ["A Great Lake", "A U.S. state capital", "A ocean current only"], tip: "Andes run along western South America." },
    { prompt: "A compass rose shows…", answer: "Cardinal directions (N, S, E, W)", wrong: ["Population only", "Book genres", "Verb tenses"], tip: "Rose → direction." },
    { prompt: "Latitude lines run…", answer: "East–west (measure north/south)", wrong: ["Only through one city", "In random zigzags only", "As book chapters"], tip: "Latitude = parallel E–W lines." },
  ],
};

const HIST: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "The Maya are known for…", answer: "Cities, writing, and calendars in Mesoamerica", wrong: ["Inventing skateboards", "Living only on Mars", "Building New York subways"], tip: "Maya = Mesoamerican civilization." },
    { prompt: "The Aztec capital was near modern…", answer: "Mexico City", wrong: ["Ottawa", "Paris", "Tokyo"], tip: "Tenochtitlán → Mexico City area." },
  ],
  mid: [
    { prompt: "The Inca built in the…", answer: "Andes Mountains", wrong: ["Sahara Desert only", "Australian Outback only", "Arctic ice only"], tip: "Inca → Andean empire." },
    { prompt: "Comparing civilizations often looks at…", answer: "Government, food, beliefs, and achievements", wrong: ["Only shoe sizes", "Only Wi‑Fi speed", "Only last names"], tip: "Culture systems matter." },
  ],
  hard: [
    { prompt: "Indigenous means…", answer: "Native to a place", wrong: ["Recently invented phones", "Only European explorers", "A map projection"], tip: "Indigenous peoples were there first." },
    { prompt: "A primary source could be…", answer: "A diary from the time period", wrong: ["A rumor invented today with no evidence", "A blank page", "A random emoji"], tip: "Primary = from the time." },
    { prompt: "Multiple perspectives help us…", answer: "See events from more than one viewpoint", wrong: ["Erase all maps", "Ignore evidence", "Stop learning history"], tip: "Different voices deepen understanding." },
  ],
};

const EXP: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "European exploration of the Americas led to…", answer: "Contact between worlds", wrong: ["The invention of fractions", "Ending all oceans", "Deleting maps"], tip: "Contact changed both sides." },
    { prompt: "Explorers often wanted…", answer: "Trade routes, land, and resources", wrong: ["To invent Wi‑Fi", "To erase the Sun", "To ban ships"], tip: "Motives: wealth, routes, power." },
  ],
  mid: [
    { prompt: "Contact had effects that were…", answer: "Helpful for some and harmful for others", wrong: ["Identical for everyone always", "Only about sports", "Only about spelling"], tip: "Impacts differed by group." },
    { prompt: "A colony is…", answer: "Territory controlled by a distant country", wrong: ["A type of adverb", "A star pattern", "A fraction"], tip: "Colony = ruled from afar." },
  ],
  hard: [
    { prompt: "Studying exploration fairly means…", answer: "Including Indigenous and European viewpoints", wrong: ["Only celebrating one side", "Ignoring primary sources", "Skipping maps"], tip: "Multiple perspectives matter." },
    { prompt: "The Columbian Exchange moved…", answer: "Plants, animals, people, and ideas across oceans", wrong: ["Only textbooks", "Only Wi‑Fi passwords", "Only poems"], tip: "Exchange reshaped both hemispheres." },
    { prompt: "Navigation tools helped explorers…", answer: "Find direction and estimate position", wrong: ["Cook fractions", "Write root words", "Build food webs"], tip: "Compass/maps aided voyages." },
  ],
};

const CIVICS: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "The U.S. capital city is…", answer: "Washington, D.C.", wrong: ["Toronto", "Cancún", "Lima"], tip: "D.C. = U.S. capital." },
    { prompt: "A citizen has…", answer: "Rights and responsibilities", wrong: ["No rules ever", "Only one opinion allowed", "No community role"], tip: "Citizenship = rights + duties." },
  ],
  mid: [
    { prompt: "The three U.S. branches help…", answer: "Separate and balance power", wrong: ["Bake bread only", "Name constellations", "Measure density"], tip: "Legislative, executive, judicial." },
    { prompt: "Voting is an example of…", answer: "Civic participation", wrong: ["A map scale", "A simile", "A food chain"], tip: "Citizens help decide leaders." },
  ],
  hard: [
    { prompt: "The Constitution is…", answer: "The plan for U.S. government", wrong: ["A weather report", "A multiplication table", "A plant cell"], tip: "Supreme law framework." },
    { prompt: "Diversity in the U.S. means…", answer: "Many cultures and backgrounds", wrong: ["Only one language ever existed", "No immigration history", "Identical climates everywhere"], tip: "Many peoples, one nation." },
    { prompt: "Laws are meant to…", answer: "Keep order and protect rights", wrong: ["Replace all maps", "Stop learning", "Delete history"], tip: "Laws guide fair communities." },
  ],
};

const TODAY: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "Canada's capital is…", answer: "Ottawa", wrong: ["Mexico City", "Santo Domingo", "Washington, D.C."], tip: "Ottawa = Canada." },
    { prompt: "Mexico is south of…", answer: "The United States", wrong: ["Antarctica only", "Only Europe", "Only Australia"], tip: "U.S. borders Mexico." },
  ],
  mid: [
    { prompt: "The Dominican Republic is in the…", answer: "Caribbean", wrong: ["Arctic Circle only", "Himalayas", "Outback"], tip: "Caribbean island nation." },
    { prompt: "Trade between countries means…", answer: "Buying and selling goods across borders", wrong: ["Only playing sports", "Only reading poems", "Deleting maps"], tip: "Trade links economies." },
  ],
  hard: [
    { prompt: "Migration often happens because people seek…", answer: "Safety, jobs, or family opportunities", wrong: ["A new verb tense", "A denser rock only", "A brighter star name"], tip: "Push/pull factors drive moves." },
    { prompt: "Environmental issues in the hemisphere can include…", answer: "Pollution, deforestation, and climate impacts", wrong: ["Only spelling tests", "Only fractions", "Only metaphors"], tip: "People + land interact." },
    { prompt: "Being a good neighbor country often means…", answer: "Cooperation on shared problems", wrong: ["Ignoring all borders forever with no plans", "Banning all maps", "Stopping trade always"], tip: "Shared challenges need teamwork." },
  ],
};

const BANKS: Record<string, (h: 1 | 2 | 3) => ArcadeChoiceQuestion[]> = {
  "map-dash": (h) => mcFromBank("maps", h, MAPS.easy, MAPS.mid, MAPS.hard),
  "civilization-charge": (h) => mcFromBank("hist", h, HIST.easy, HIST.mid, HIST.hard),
  "exploration-run": (h) => mcFromBank("exp", h, EXP.easy, EXP.mid, EXP.hard),
  "civics-circuit": (h) => mcFromBank("civics", h, CIVICS.easy, CIVICS.mid, CIVICS.hard),
  "hemisphere-hustle": (h) => mcFromBank("today", h, TODAY.easy, TODAY.mid, TODAY.hard),
};

export function socialQuestionsForMode(modeId: string, hardness: 1 | 2 | 3): ArcadeChoiceQuestion[] {
  const fn = BANKS[modeId] ?? BANKS["map-dash"]!;
  return shuffle(fn(hardness));
}
