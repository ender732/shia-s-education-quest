/** ELA Arcade — warm coral / amber family. */

import { mcFromBank, shuffle, type StaticMcItem } from "@/lib/arcade/questions";
import type { ArcadeChoiceQuestion, ArcadeMode, ArcadeTheme } from "@/lib/arcade/types";

const CORAL: ArcadeTheme = {
  skyTop: "#2a120c",
  skyBottom: "#7c2d12",
  ground: "#5c2410",
  groundLine: "#fb923c",
  player: "#fdba74",
  playerGlow: "rgba(251, 146, 60, 0.55)",
  obstacle: "#9a5530",
  spike: "#ef4444",
  portal: "#fbbf24",
  orb: "#fcd34d",
  accentLabel: "Story",
  uiAccent: "#fb923c",
  uiAccentSoft: "rgba(251, 146, 60, 0.15)",
};

const AMBER_ROOTS: ArcadeTheme = {
  ...CORAL,
  skyTop: "#2c1808",
  skyBottom: "#92400e",
  groundLine: "#fbbf24",
  player: "#fcd34d",
  portal: "#f97316",
  orb: "#fde68a",
  accentLabel: "Roots",
};

const AMBER_MAIN: ArcadeTheme = {
  ...CORAL,
  skyTop: "#30140e",
  skyBottom: "#9a3412",
  groundLine: "#f97316",
  player: "#fb923c",
  accentLabel: "Main Idea",
};

const AMBER_FIG: ArcadeTheme = {
  ...CORAL,
  skyTop: "#2a160a",
  skyBottom: "#b45309",
  groundLine: "#f59e0b",
  player: "#fbbf24",
  portal: "#ea580c",
  accentLabel: "Figurative",
};

const AMBER_GRAM: ArcadeTheme = {
  ...CORAL,
  skyTop: "#28140c",
  skyBottom: "#c2410c",
  groundLine: "#fdba74",
  player: "#fed7aa",
  accentLabel: "Grammar",
};

export const ELA_MODES: ArcadeMode[] = [
  {
    id: "story-sprint",
    title: "Story Sprint",
    blurb: "Character change and narrative evidence at dash speed.",
    unitTags: ["187_ELA_UNIT1"],
    theme: CORAL,
    engine: "dash",
    playable: true,
  },
  {
    id: "root-rush",
    title: "Root Rush",
    blurb: "Greek & Latin roots light the portals.",
    unitTags: ["187_ELA_ROOTS"],
    theme: AMBER_ROOTS,
    engine: "dash",
    playable: true,
  },
  {
    id: "main-idea-march",
    title: "Main Idea March",
    blurb: "Pick the main idea and supporting evidence under pressure.",
    unitTags: ["187_ELA_MAIN_IDEA"],
    theme: AMBER_MAIN,
    engine: "dash",
    playable: true,
  },
  {
    id: "figurative-flight",
    title: "Figurative Flight",
    blurb: "Simile, metaphor, and idiom gates keep you flying.",
    unitTags: ["187_ELA_UNIT1", "187_ELA_MAIN_IDEA"],
    theme: AMBER_FIG,
    engine: "dash",
    playable: true,
  },
  {
    id: "grammar-gauntlet",
    title: "Grammar Gauntlet",
    blurb: "Parts of speech and sentence sense between spikes.",
    unitTags: ["187_RACECE_FORMAT"],
    theme: AMBER_GRAM,
    engine: "dash",
    playable: true,
  },
];

const STORY: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "A character who learns honesty after lying shows…", answer: "Character change", wrong: ["Setting only", "A rhyme scheme", "A glossary"], tip: "Growth or a new lesson = character change." },
    { prompt: "Which is text evidence?", answer: "A quote from the story", wrong: ["Your opinion only", "A book cover color", "A page count"], tip: "Evidence comes from the text itself." },
    { prompt: "The time and place of a story is the…", answer: "Setting", wrong: ["Theme", "Plot twist", "Narrator"], tip: "Setting = when and where." },
  ],
  mid: [
    { prompt: "If Maya shares her lunch after being selfish, the change is…", answer: "She becomes more caring", wrong: ["The setting moved", "Nothing changed", "She forgot lunch"], tip: "Actions show how she grew." },
    { prompt: "Best evidence that a character is brave?", answer: "She faces the storm to help a friend", wrong: ["She likes blue", "She is tall", "She owns a cat"], tip: "Brave acts prove bravery." },
  ],
  hard: [
    { prompt: "Theme is best described as…", answer: "The big lesson or message", wrong: ["Only the first sentence", "The author's middle name", "A chapter title alone"], tip: "Theme = underlying message." },
    { prompt: "First-person narrator uses…", answer: "I / me", wrong: ["He / she only", "You must", "No pronouns"], tip: "First person = I/me voice." },
    { prompt: "Conflict in a story is…", answer: "The main problem the character faces", wrong: ["The last page number", "A table of contents", "A synonym list"], tip: "Conflict drives the plot." },
  ],
};

const ROOTS: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "The root \"aqua\" relates to…", answer: "Water", wrong: ["Fire", "Sound", "Light"], tip: "Aquarium, aquatic → water." },
    { prompt: "\"Bio\" means…", answer: "Life", wrong: ["Earth", "Write", "Small"], tip: "Biology = study of life." },
    { prompt: "\"Tele\" means…", answer: "Far / distant", wrong: ["Under", "Many", "Heat"], tip: "Telephone, television → far." },
  ],
  mid: [
    { prompt: "\"Graph\" means…", answer: "Write / draw", wrong: ["Eat", "Jump", "Sleep"], tip: "Autograph, paragraph → write." },
    { prompt: "\"Port\" means…", answer: "Carry", wrong: ["Break", "Count", "Hide"], tip: "Transport, portable → carry." },
  ],
  hard: [
    { prompt: "\"Chron\" means…", answer: "Time", wrong: ["Color", "Shape", "Taste"], tip: "Chronological, synchronize → time." },
    { prompt: "\"Spect\" means…", answer: "Look / see", wrong: ["Hear", "Taste", "Run"], tip: "Inspect, spectator → look." },
    { prompt: "\"Dict\" means…", answer: "Say / speak", wrong: ["Build", "Swim", "Plant"], tip: "Dictate, dictionary → say." },
  ],
};

const MAIN: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "Main idea is…", answer: "What the text is mostly about", wrong: ["A single adjective", "The author's shoe size", "A footnote only"], tip: "Main idea = central point." },
    { prompt: "A detail that supports the main idea is…", answer: "Supporting evidence", wrong: ["A random doodle", "The ISBN", "A blank page"], tip: "Details back up the main idea." },
  ],
  mid: [
    { prompt: "Paragraph about bees making honey — main idea?", answer: "Bees produce honey", wrong: ["Bees are yellow only", "Honey is purple", "Flowers hate bees"], tip: "Focus on the central fact." },
    { prompt: "Which sentence is least helpful as evidence?", answer: "I think bees are cute", wrong: ["Bees collect nectar", "Workers fill honeycomb cells", "Honey is stored for winter"], tip: "Opinions aren't strong text evidence." },
  ],
  hard: [
    { prompt: "Summarizing means…", answer: "Retelling key points in fewer words", wrong: ["Copying every sentence", "Ignoring the text", "Only listing verbs"], tip: "Summary = short + essential." },
    { prompt: "If most sentences describe ocean pollution, main idea is about…", answer: "Ocean pollution", wrong: ["Desert animals", "Space travel", "Baking bread"], tip: "Repeated focus reveals main idea." },
    { prompt: "A topic sentence often…", answer: "States the main idea of a paragraph", wrong: ["Ends every book", "Lists every noun", "Hides the meaning"], tip: "Topic sentence → main idea." },
  ],
};

const FIG: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "\"As brave as a lion\" is a…", answer: "Simile", wrong: ["Hyperbole only", "Onomatopoeia", "Homophone"], tip: "Simile uses like or as." },
    { prompt: "\"The classroom was a zoo\" is a…", answer: "Metaphor", wrong: ["Haiku", "Footnote", "Caption"], tip: "Metaphor compares without like/as." },
  ],
  mid: [
    { prompt: "\"It's raining cats and dogs\" means…", answer: "It's raining very hard", wrong: ["Animals fell from clouds", "It's sunny", "No rain at all"], tip: "Idiom = figurative meaning." },
    { prompt: "Personification gives…", answer: "Human traits to non-human things", wrong: ["Only rhymes", "Page numbers", "A glossary"], tip: "The wind whispered = personification." },
  ],
  hard: [
    { prompt: "\"I've told you a million times\" is…", answer: "Hyperbole", wrong: ["Literal count", "A setting", "A root word"], tip: "Hyperbole = exaggeration." },
    { prompt: "Onomatopoeia is a word that…", answer: "Sounds like what it names", wrong: ["Means opposite", "Is always Latin", "Has no vowels"], tip: "Buzz, crash, hiss." },
    { prompt: "\"Her smile was sunshine\" compares using…", answer: "Metaphor", wrong: ["Only alliteration", "A timeline", "A caption"], tip: "No like/as → metaphor." },
  ],
};

const GRAM: { easy: StaticMcItem[]; mid: StaticMcItem[]; hard: StaticMcItem[] } = {
  easy: [
    { prompt: "Which is a noun?", answer: "Teacher", wrong: ["Quickly", "Happy", "Run"], tip: "Noun = person, place, thing." },
    { prompt: "Which is a verb?", answer: "Jumps", wrong: ["Blue", "Softly", "Desk"], tip: "Verb = action or state." },
  ],
  mid: [
    { prompt: "An adjective describes a…", answer: "Noun", wrong: ["Only a period", "A chapter number", "A bookmark"], tip: "Adjectives modify nouns." },
    { prompt: "Subject and predicate make a…", answer: "Complete sentence", wrong: ["Fragment only", "Dictionary", "Synonym pair"], tip: "Who/what + action = sentence." },
  ],
  hard: [
    { prompt: "\"Their\" shows…", answer: "Possession (belonging)", wrong: ["A place to go", "Past tense of they", "A contraction of they are"], tip: "Their books = belonging." },
    { prompt: "A conjunction like \"and\" …", answer: "Joins words or clauses", wrong: ["Ends every paragraph", "Names a setting", "Is always a noun"], tip: "And/but/or connect ideas." },
    { prompt: "\"She's\" is a contraction of…", answer: "She is / she has", wrong: ["She was only", "She will never", "She can"], tip: "Apostrophe marks missing letters." },
  ],
};

const BANKS: Record<string, (h: 1 | 2 | 3) => ArcadeChoiceQuestion[]> = {
  "story-sprint": (h) => mcFromBank("story", h, STORY.easy, STORY.mid, STORY.hard),
  "root-rush": (h) => mcFromBank("roots", h, ROOTS.easy, ROOTS.mid, ROOTS.hard),
  "main-idea-march": (h) => mcFromBank("main", h, MAIN.easy, MAIN.mid, MAIN.hard),
  "figurative-flight": (h) => mcFromBank("fig", h, FIG.easy, FIG.mid, FIG.hard),
  "grammar-gauntlet": (h) => mcFromBank("gram", h, GRAM.easy, GRAM.mid, GRAM.hard),
};

export function elaQuestionsForMode(modeId: string, hardness: 1 | 2 | 3): ArcadeChoiceQuestion[] {
  const fn = BANKS[modeId] ?? BANKS["story-sprint"]!;
  return shuffle(fn(hardness));
}
