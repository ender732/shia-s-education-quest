/** Assigned Reading Arcade — deep indigo / gold family. */

import { mcFromBank, shuffle, type StaticMcItem } from "@/lib/arcade/questions";
import type { ArcadeChoiceQuestion, ArcadeMode, ArcadeTheme } from "@/lib/arcade/types";

const INDIGO: ArcadeTheme = {
  skyTop: "#12082a",
  skyBottom: "#312e81",
  ground: "#1e1b4b",
  groundLine: "#fbbf24",
  player: "#fcd34d",
  playerGlow: "rgba(251, 191, 36, 0.55)",
  obstacle: "#4c1d95",
  spike: "#f472b6",
  portal: "#f59e0b",
  orb: "#a5b4fc",
  accentLabel: "Vocab",
  uiAccent: "#a5b4fc",
  uiAccentSoft: "rgba(165, 180, 252, 0.18)",
};

const INDIGO_COMP: ArcadeTheme = {
  ...INDIGO,
  skyTop: "#150a30",
  skyBottom: "#3730a3",
  groundLine: "#f59e0b",
  player: "#fde68a",
  portal: "#fbbf24",
  orb: "#c4b5fd",
  accentLabel: "Comprehension",
};

const INDIGO_RACE: ArcadeTheme = {
  ...INDIGO,
  skyTop: "#100826",
  skyBottom: "#4338ca",
  groundLine: "#eab308",
  player: "#facc15",
  accentLabel: "RACECE",
};

const INDIGO_GENRE: ArcadeTheme = {
  ...INDIGO,
  skyTop: "#180c34",
  skyBottom: "#4c1d95",
  groundLine: "#fcd34d",
  player: "#fde047",
  portal: "#818cf8",
  orb: "#fbbf24",
  accentLabel: "Genre",
};

export const READING_MODES: ArcadeMode[] = [
  {
    id: "vocab-voyage",
    title: "Vocab Voyage",
    blurb: "Word meaning gates on an indigo night sky.",
    unitTags: ["187_READ_LOG"],
    theme: INDIGO,
    engine: "dash",
    playable: true,
  },
  {
    id: "comprehension-cruise",
    title: "Comprehension Cruise",
    blurb: "Who, what, why — proof from the pages.",
    unitTags: ["187_READ_LOG"],
    theme: INDIGO_COMP,
    engine: "dash",
    playable: true,
  },
  {
    id: "racece-relay",
    title: "RACECE Relay",
    blurb: "Restate, answer, cite, explain — book-report ready.",
    unitTags: ["187_RACECE_FORMAT", "187_READ_LOG"],
    theme: INDIGO_RACE,
    engine: "dash",
    playable: true,
  },
  {
    id: "genre-glide",
    title: "Genre Glide",
    blurb: "Fiction, nonfiction, and narrator smarts.",
    unitTags: ["187_READ_LOG"],
    theme: INDIGO_GENRE,
    engine: "dash",
    playable: true,
  },
];

const VOCAB: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "\"Enormous\" means…", answer: "Very large", wrong: ["Very tiny", "Very quiet", "Very sticky"], tip: "Enormous = huge." },
    { prompt: "A synonym for \"happy\" is…", answer: "Glad", wrong: ["Angry", "Empty", "Frozen"], tip: "Synonym = similar meaning." },
  ],
  mid: [
    { prompt: "An antonym for \"ancient\" is…", answer: "Modern / new", wrong: ["Old", "Historic", "Aged"], tip: "Antonym = opposite." },
    { prompt: "Context clues help you…", answer: "Figure out a word from nearby sentences", wrong: ["Ignore the paragraph", "Skip all books", "Delete vocabulary"], tip: "Neighbors in the text help." },
  ],
  hard: [
    { prompt: "\"Reluctant\" most nearly means…", answer: "Unwilling / hesitant", wrong: ["Excited always", "Invisible", "Identical"], tip: "Reluctant = not eager." },
    { prompt: "A glossary is…", answer: "A list of important words and definitions", wrong: ["A chapter cliffhanger", "A book cover color", "A page margin doodle"], tip: "Glossary = word bank." },
    { prompt: "\"Predict\" means…", answer: "Say what might happen next", wrong: ["Forget the plot", "Only copy titles", "Erase evidence"], tip: "Pre-dict → say before." },
  ],
};

const COMP: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "Who questions ask about…", answer: "A person or character", wrong: ["Only the weather", "Only page numbers", "Only fonts"], tip: "Who = people." },
    { prompt: "Where questions ask about…", answer: "A place / setting", wrong: ["Only verbs", "Only synonyms", "Only ISBNs"], tip: "Where = location." },
  ],
  mid: [
    { prompt: "Why questions usually need…", answer: "A reason from the text", wrong: ["A random guess with no link", "Only the cover color", "A math formula"], tip: "Why → because + evidence." },
    { prompt: "Inferring means…", answer: "Using clues + what you know", wrong: ["Copying one word only", "Skipping the chapter", "Ignoring characters"], tip: "Read between the lines." },
  ],
  hard: [
    { prompt: "The best way to check an answer is…", answer: "Go back to the text for proof", wrong: ["Only ask a friend with no reading", "Ignore the passage", "Pick the longest choice always"], tip: "Text evidence wins." },
    { prompt: "Sequence words like first/next/finally show…", answer: "Order of events", wrong: ["Only character height", "Only book price", "Only font size"], tip: "Sequence = order." },
    { prompt: "Author's purpose might be to…", answer: "Inform, persuade, or entertain", wrong: ["Hide all meaning forever", "Remove all punctuation", "Ban chapters"], tip: "PIE: persuade, inform, entertain." },
  ],
};

const RACE: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "In RACECE, the \"R\" often means…", answer: "Restate the question", wrong: ["Run away", "Random guess", "Remove evidence"], tip: "Restate → show you understood the ask." },
    { prompt: "Citing means…", answer: "Using evidence from the text", wrong: ["Ignoring the book", "Only giving opinions", "Skipping quotes/paraphrase"], tip: "Cite the text." },
  ],
  mid: [
    { prompt: "After you answer, you should…", answer: "Explain how evidence supports you", wrong: ["Stop immediately forever", "Delete the question", "Only list synonyms"], tip: "Explain connects claim + proof." },
    { prompt: "A strong book-report sentence includes…", answer: "Claim + text evidence", wrong: ["Only \"I like it\"", "Only the page count", "Only the barcode"], tip: "Claim needs support." },
  ],
  hard: [
    { prompt: "Paraphrasing evidence means…", answer: "Putting the idea in your own words", wrong: ["Copying a whole chapter", "Inventing fake quotes", "Ignoring the text"], tip: "Own words, same meaning." },
    { prompt: "RACECE writing should stay…", answer: "Focused on the prompt", wrong: ["About unrelated games only", "Without any evidence", "Only one adjective long"], tip: "Stay on task." },
    { prompt: "Extending (the last E) often adds…", answer: "A connection or deeper insight", wrong: ["A random grocery list", "A math formula only", "A map of Mars only"], tip: "Extend = thoughtful connection." },
  ],
};

const GENRE: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "Fiction is…", answer: "Made-up stories", wrong: ["Only true news", "Only dictionaries", "Only calendars"], tip: "Fiction = invented." },
    { prompt: "Nonfiction is…", answer: "About real information / true topics", wrong: ["Only dragons always", "Only rhymes", "Only blank pages"], tip: "Nonfiction informs about reality." },
  ],
  mid: [
    { prompt: "A narrator who says \"I\" is…", answer: "First person", wrong: ["Only third person", "A glossary", "A genre called math"], tip: "I/me = first person." },
    { prompt: "Biography is…", answer: "A true story of someone's life", wrong: ["A made-up fairy only", "A weather map", "A multiplication table"], tip: "Bio = life story." },
  ],
  hard: [
    { prompt: "Realistic fiction has…", answer: "Made-up events that could happen in real life", wrong: ["Only talking planets always", "Only true news articles", "Only blank chapter books"], tip: "Believable but invented." },
    { prompt: "Fantasy often includes…", answer: "Magic or impossible worlds", wrong: ["Only lab reports", "Only tax forms", "Only bus schedules"], tip: "Fantasy bends reality." },
    { prompt: "Genre helps readers…", answer: "Know what to expect from a book", wrong: ["Erase the plot", "Skip all words", "Ban evidence"], tip: "Genre sets expectations." },
  ],
};

const BANKS: Record<string, (h: 1 | 2 | 3) => ArcadeChoiceQuestion[]> = {
  "vocab-voyage": (h) => mcFromBank("vocab", h, VOCAB.easy, VOCAB.mid, VOCAB.hard),
  "comprehension-cruise": (h) => mcFromBank("comp", h, COMP.easy, COMP.mid, COMP.hard),
  "racece-relay": (h) => mcFromBank("race", h, RACE.easy, RACE.mid, RACE.hard),
  "genre-glide": (h) => mcFromBank("genre", h, GENRE.easy, GENRE.mid, GENRE.hard),
};

export function readingQuestionsForMode(modeId: string, hardness: 1 | 2 | 3): ArcadeChoiceQuestion[] {
  const fn = BANKS[modeId] ?? BANKS["vocab-voyage"]!;
  return shuffle(fn(hardness));
}
