export type ChoiceQuestion = {
  id: string;
  type: "choice";
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export type ShortQuestion = {
  id: string;
  type: "short";
  prompt: string;
  /** Accepted answers after normalize (lowercase, trimmed). */
  accepted: string[];
  explanation: string;
  placeholder?: string;
};

export type Question = ChoiceQuestion | ShortQuestion;

export type Lesson = {
  unitTag: string;
  title: string;
  teach: string[];
  tip: string;
  passPercent: number;
  questions: Question[];
};

function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[$,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\.$/, "");
}

export function checkAnswer(question: Question, raw: string | number): boolean {
  if (question.type === "choice") {
    return Number(raw) === question.correctIndex;
  }
  const answer = normalizeAnswer(String(raw));
  return question.accepted.some((a) => normalizeAnswer(a) === answer);
}

export const LESSONS: Record<string, Lesson> = {
  "187_MATH_WHOLE_NUM": {
    unitTag: "187_MATH_WHOLE_NUM",
    title: "Multi-Digit Multiplication",
    teach: [
      "When you multiply a 3-digit number by a 2-digit number, break the 2-digit number into tens and ones.",
      "Example: 246 × 32 = (246 × 30) + (246 × 2).",
      "246 × 2 = 492. 246 × 30 = 7,380. Add them: 7,380 + 492 = 7,872.",
      "Line up place values carefully and carry when a product is 10 or more.",
    ],
    tip: "Estimate first: 250 × 30 = 7,500. Your exact answer should be near that.",
    passPercent: 70,
    questions: [
      {
        id: "mwn1",
        type: "choice",
        prompt: "What is 125 × 14?",
        choices: ["1,650", "1,750", "1,850", "2,000"],
        correctIndex: 1,
        explanation: "125 × 10 = 1,250 and 125 × 4 = 500. 1,250 + 500 = 1,750.",
      },
      {
        id: "mwn2",
        type: "short",
        prompt: "Compute 246 × 32. Enter the number only.",
        accepted: ["7872", "7,872"],
        explanation: "246 × 2 = 492 and 246 × 30 = 7,380. Sum = 7,872.",
        placeholder: "e.g. 7872",
      },
      {
        id: "mwn3",
        type: "choice",
        prompt: "Which estimate is best for 398 × 21?",
        choices: ["400 × 20 = 8,000", "300 × 20 = 6,000", "400 × 30 = 12,000", "500 × 20 = 10,000"],
        correctIndex: 0,
        explanation: "398 is about 400 and 21 is about 20, so 8,000 is the closest estimate.",
      },
      {
        id: "mwn4",
        type: "short",
        prompt: "What is 305 × 24?",
        accepted: ["7320", "7,320"],
        explanation: "305 × 20 = 6,100 and 305 × 4 = 1,220. Total = 7,320.",
      },
      {
        id: "mwn5",
        type: "choice",
        prompt: "In 467 × 53, which partial product comes from multiplying by the tens digit?",
        choices: ["467 × 3", "467 × 5", "467 × 50", "467 × 53"],
        correctIndex: 2,
        explanation: "The 5 is in the tens place, so you multiply by 50 (or by 5 and shift one place left).",
      },
    ],
  },

  "187_MATH_DECIMALS": {
    unitTag: "187_MATH_DECIMALS",
    title: "Decimals to Thousandths",
    teach: [
      "Place values after the decimal: tenths (0.1), hundredths (0.01), thousandths (0.001).",
      "To compare decimals, line up the decimal points and compare digit by digit from the left.",
      "Rounding: look at the next digit. 5 or greater → round up. Less than 5 → stay the same.",
      "When adding/subtracting, always line up the decimal points first.",
    ],
    tip: "Write zeros as placeholders: 0.7 = 0.700. That makes comparing easier.",
    passPercent: 70,
    questions: [
      {
        id: "dec1",
        type: "choice",
        prompt: "Which digit is in the thousandths place of 4. prov?",
        choices: ["7", "2", "6", "4"],
        correctIndex: 2,
        explanation: "4 is ones, 7 tenths, 2 hundredths, 6 thousandths.",
      },
      {
        id: "dec2",
        type: "choice",
        prompt: "Which is greater: 0.48 or 0.485?",
        choices: ["0.48", "0.485", "They are equal", "Cannot tell"],
        correctIndex: 1,
        explanation: "0.48 = 0.480. Compare thousandths: 5 > 0, so 0.485 is greater.",
      },
      {
        id: "dec3",
        type: "short",
        prompt: "Round 3.146 to the nearest hundredth.",
        accepted: ["3.15"],
        explanation: "Hundredths digit is 4; next digit is 6 ≥ 5, so round up to 3.15.",
        placeholder: "e.g. 3.15",
      },
      {
        id: "dec4",
        type: "short",
        prompt: "What is 2.35 + 1.476?",
        accepted: ["3.826"],
        explanation: "Line up decimals: 2.350 + 1.476 = 3.826.",
      },
      {
        id: "dec5",
        type: "choice",
        prompt: "What is 5.20 − 3.085?",
        choices: ["2.115", "2.125", "1.115", "2.215"],
        correctIndex: 0,
        explanation: "5.200 − 3.085 = 2.115.",
      },
    ],
  },

  "187_MATH_FRACTIONS": {
    unitTag: "187_MATH_FRACTIONS",
    title: "Fractions with Unlike Denominators",
    teach: [
      "You can only add or subtract fractions that share the same denominator.",
      "Find a common denominator (often the least common multiple of both denominators).",
      "Rewrite each fraction as an equivalent fraction, then add or subtract the numerators.",
      "Simplify the answer when you can.",
    ],
    tip: "For 1/3 + 1/4, LCM of 3 and 4 is 12 → 4/12 + 3/12 = 7/12.",
    passPercent: 70,
    questions: [
      {
        id: "fr1",
        type: "choice",
        prompt: "What is a common denominator for 1/3 and 1/4?",
        choices: ["6", "8", "12", "7"],
        correctIndex: 2,
        explanation: "3 × 4 = 12, and 12 is the least common multiple.",
      },
      {
        id: "fr2",
        type: "short",
        prompt: "Compute 1/3 + 1/4. Answer as a simplified fraction like 7/12.",
        accepted: ["7/12"],
        explanation: "4/12 + 3/12 = 7/12.",
        placeholder: "e.g. 7/12",
      },
      {
        id: "fr3",
        type: "short",
        prompt: "Compute 5/6 − 1/3. Simplified fraction.",
        accepted: ["1/2", "3/6"],
        explanation: "5/6 − 2/6 = 3/6 = 1/2.",
      },
      {
        id: "fr4",
        type: "choice",
        prompt: "Which pair is equivalent?",
        choices: ["2/3 and 4/9", "2/3 and 4/6", "2/3 and 3/2", "2/3 and 2/6"],
        correctIndex: 1,
        explanation: "2/3 × 2/2 = 4/6.",
      },
      {
        id: "fr5",
        type: "short",
        prompt: "What is 2/5 + 1/10?",
        accepted: ["1/2", "5/10"],
        explanation: "4/10 + 1/10 = 5/10 = 1/2.",
      },
    ],
  },

  "187_MATH_VOLUME": {
    unitTag: "187_MATH_VOLUME",
    title: "Volume of Rectangular Prisms",
    teach: [
      "Volume measures how much space a solid takes up.",
      "For a rectangular prism: V = length × width × height.",
      "Units are cubic units (cm³, in³).",
      "For composite shapes, split into prisms, find each volume, then add.",
    ],
    tip: "If cubes are 1 cm on each side, count the cubes — that count is the volume in cm³.",
    passPercent: 70,
    questions: [
      {
        id: "vol1",
        type: "short",
        prompt: "A box is 4 cm by 3 cm by 5 cm. What is its volume in cm³? Number only.",
        accepted: ["60"],
        explanation: "4 × 3 × 5 = 60 cm³.",
      },
      {
        id: "vol2",
        type: "choice",
        prompt: "Which formula finds the volume of a rectangular prism?",
        choices: ["l + w + h", "2(l + w)", "l × w × h", "l × w"],
        correctIndex: 2,
        explanation: "Volume is length times width times height.",
      },
      {
        id: "vol3",
        type: "short",
        prompt: "A prism has base area 12 in² and height 7 in. Volume?",
        accepted: ["84"],
        explanation: "V = base area × height = 12 × 7 = 84 in³.",
      },
      {
        id: "vol4",
        type: "choice",
        prompt: "Two prisms have volumes 24 cm³ and 18 cm³. Combined volume?",
        choices: ["6 cm³", "42 cm³", "432 cm³", "21 cm³"],
        correctIndex: 1,
        explanation: "Add the volumes of the pieces: 24 + 18 = 42.",
      },
      {
        id: "vol5",
        type: "short",
        prompt: "Length 10, width 2, height 3. Volume?",
        accepted: ["60"],
        explanation: "10 × 2 × 3 = 60.",
      },
    ],
  },

  "187_ELA_UNIT1": {
    unitTag: "187_ELA_UNIT1",
    title: "Character Change in Narratives",
    teach: [
      "Characters change because of events, relationships, or what they learn.",
      "Look for what the character wanted at the beginning vs. the end.",
      "Evidence means words or actions from the text — not just your opinion.",
      "A strong answer names the change and proves it with two clear details.",
    ],
    tip: "Ask: What did they believe before? What do they believe now? What moment caused the shift?",
    passPercent: 70,
    questions: [
      {
        id: "ela1",
        type: "choice",
        prompt: "What is character change?",
        choices: [
          "When the setting moves to a new place",
          "When a character’s traits, feelings, or beliefs shift",
          "When the author adds a new chapter title",
          "When the plot has no conflict",
        ],
        correctIndex: 1,
        explanation: "Character change is an internal or behavioral shift shown in the story.",
      },
      {
        id: "ela2",
        type: "choice",
        prompt: "Which sentence is text evidence?",
        choices: [
          "I think the character is brave.",
          "The story was exciting.",
          "Maya whispered, “I won’t run this time,” and stepped forward.",
          "Brave characters are better.",
        ],
        correctIndex: 2,
        explanation: "Evidence quotes or closely describes what the text actually shows.",
      },
      {
        id: "ela3",
        type: "choice",
        prompt: "A shy boy starts speaking up after joining a team. Best theme connection?",
        choices: [
          "Belonging can build confidence",
          "Sports are always easy",
          "Shy people never change",
          "Teams do not matter",
        ],
        correctIndex: 0,
        explanation: "His change is tied to finding support and belonging.",
      },
      {
        id: "ela4",
        type: "short",
        prompt: "Fill in: A strong analysis needs a claim plus ____ from the text.",
        accepted: ["evidence", "proof", "details", "examples", "citations"],
        explanation: "Claims must be supported with evidence from the text.",
        placeholder: "one word",
      },
      {
        id: "ela5",
        type: "choice",
        prompt: "Which shows a character’s feelings most clearly?",
        choices: [
          "It was Tuesday.",
          "The river was wide.",
          "His hands shook as he opened the letter.",
          "There were twelve houses on the street.",
        ],
        correctIndex: 2,
        explanation: "Actions and body language often reveal emotion.",
      },
    ],
  },

  "187_ELA_ROOTS": {
    unitTag: "187_ELA_ROOTS",
    title: "Greek & Latin Roots",
    teach: [
      "Many English words are built from Greek and Latin roots.",
      "If you know the root, you can unlock unfamiliar words.",
      "Examples: bio = life, graph = write, tele = far, port = carry, rupt = break.",
      "Prefixes and suffixes attach to roots to change meaning.",
    ],
    tip: "Break the word apart: tele + phone = far + sound.",
    passPercent: 70,
    questions: [
      {
        id: "root1",
        type: "choice",
        prompt: "The root bio most nearly means:",
        choices: ["water", "life", "earth", "light"],
        correctIndex: 1,
        explanation: "Biology is the study of life; biography is the story of a life.",
      },
      {
        id: "root2",
        type: "choice",
        prompt: "In telegraph, tele means:",
        choices: ["sound", "write", "far", "small"],
        correctIndex: 2,
        explanation: "Tele means far — a telegraph sends writing across a distance.",
      },
      {
        id: "root3",
        type: "short",
        prompt: "What does the root port mean? (one word)",
        accepted: ["carry", "to carry"],
        explanation: "Transport = carry across; portable = able to be carried.",
      },
      {
        id: "root4",
        type: "choice",
        prompt: "Which word shares a root with interrupt?",
        choices: ["erupt", "import", "biology", "telephone"],
        correctIndex: 0,
        explanation: "Rupt means break — interrupt and erupt both use that root.",
      },
      {
        id: "root5",
        type: "choice",
        prompt: "Autograph most nearly means:",
        choices: [
          "a far-away sound",
          "a person’s own signature / self-writing",
          "a broken machine",
          "a living animal",
        ],
        correctIndex: 1,
        explanation: "Auto = self, graph = write.",
      },
    ],
  },

  "187_RACECE_FORMAT": {
    unitTag: "187_RACECE_FORMAT",
    title: "RACECE Writing Framework",
    teach: [
      "RACECE helps you write a complete constructed response:",
      "R — Restate the question. A — Answer directly.",
      "C — Cite evidence #1. E — Explain that evidence.",
      "C — Cite evidence #2. E — Explain the second piece.",
      "Two citations make your answer stronger and more convincing.",
    ],
    tip: "Sentence starters: “The text states…” then “This shows…”",
    passPercent: 70,
    questions: [
      {
        id: "race1",
        type: "choice",
        prompt: "In RACECE, the first C stands for:",
        choices: ["Compare", "Cite evidence", "Conclude", "Capitalize"],
        correctIndex: 1,
        explanation: "C = Cite — use words or details from the text.",
      },
      {
        id: "race2",
        type: "choice",
        prompt: "What should you do right after citing evidence?",
        choices: [
          "Restate the question again",
          "Explain how the evidence supports your answer",
          "Start a new unrelated topic",
          "List vocabulary words",
        ],
        correctIndex: 1,
        explanation: "E = Explain — connect the quote to your answer.",
      },
      {
        id: "race3",
        type: "short",
        prompt: "How many pieces of text evidence does RACECE ask for? (number)",
        accepted: ["2", "two"],
        explanation: "RACECE includes Cite + Explain twice.",
      },
      {
        id: "race4",
        type: "choice",
        prompt: "Which is the best Restate of: “Why did Jordan leave early?”",
        choices: [
          "Because he was tired.",
          "Jordan left early because…",
          "Yes.",
          "The story is about Jordan.",
        ],
        correctIndex: 1,
        explanation: "Restating turns the question into the start of your answer sentence.",
      },
      {
        id: "race5",
        type: "choice",
        prompt: "Why explain evidence instead of only quoting?",
        choices: [
          "To make the paragraph longer for no reason",
          "To show how the quote proves your answer",
          "Because quotes are never allowed",
          "To avoid answering the question",
        ],
        correctIndex: 1,
        explanation: "Explanation shows your thinking — the quote alone is not enough.",
      },
    ],
  },

  "187_SCI_MATTER": {
    unitTag: "187_SCI_MATTER",
    title: "Properties of Matter",
    teach: [
      "Matter is anything that has mass and takes up space.",
      "Observable properties include color, texture, hardness, and state (solid/liquid/gas).",
      "Measurable properties include mass, volume, temperature, and density.",
      "We classify materials by comparing these properties.",
    ],
    tip: "Ask: Can I see it? Feel it? Measure it with a tool?",
    passPercent: 70,
    questions: [
      {
        id: "mat1",
        type: "choice",
        prompt: "Which is a measurable property of matter?",
        choices: ["Pretty", "Mass", "Favorite", "Mysterious"],
        correctIndex: 1,
        explanation: "Mass can be measured with a balance or scale.",
      },
      {
        id: "mat2",
        type: "choice",
        prompt: "Water freezing into ice is mainly a change in:",
        choices: ["Color only", "State of matter", "The type of atoms", "Magnetism"],
        correctIndex: 1,
        explanation: "Freezing changes liquid water to solid ice — a state change.",
      },
      {
        id: "mat3",
        type: "short",
        prompt: "Matter must have mass and take up ____.",
        accepted: ["space", "volume"],
        explanation: "By definition, matter has mass and occupies space (volume).",
      },
      {
        id: "mat4",
        type: "choice",
        prompt: "Which tool best measures mass?",
        choices: ["Ruler", "Thermometer", "Balance / scale", "Compass"],
        correctIndex: 2,
        explanation: "A balance or scale measures mass.",
      },
      {
        id: "mat5",
        type: "choice",
        prompt: "Density compares a material’s mass to its:",
        choices: ["Color", "Volume", "Smell", "Age"],
        correctIndex: 1,
        explanation: "Density = mass ÷ volume.",
      },
    ],
  },

  "187_SCI_MASS": {
    unitTag: "187_SCI_MASS",
    title: "Conservation of Mass",
    teach: [
      "In a closed system, mass is conserved — it doesn’t appear or disappear.",
      "When substances mix or change form, total mass stays the same if nothing escapes.",
      "Example: vinegar + baking soda in a sealed bag still has the same total mass.",
      "If a gas escapes into the air, the container can seem lighter — but the mass moved, it didn’t vanish.",
    ],
    tip: "Think: mass is rearranged, not erased.",
    passPercent: 70,
    questions: [
      {
        id: "mass1",
        type: "choice",
        prompt: "Conservation of mass means:",
        choices: [
          "Mass can be created from nothing",
          "Total mass stays the same in a closed system",
          "Solids have no mass",
          "Gases cannot have mass",
        ],
        correctIndex: 1,
        explanation: "Mass is conserved; it changes form or location, not total amount.",
      },
      {
        id: "mass2",
        type: "choice",
        prompt: "Ice melts into water in a sealed jar. Total mass:",
        choices: ["Increases", "Decreases", "Stays the same", "Becomes zero"],
        correctIndex: 2,
        explanation: "Same water molecules, different state — mass unchanged.",
      },
      {
        id: "mass3",
        type: "short",
        prompt: "If 10 g of powder mixes with 20 g of water in a closed cup, total mass is ___ g.",
        accepted: ["30"],
        explanation: "10 + 20 = 30 g before and after mixing in a closed system.",
      },
      {
        id: "mass4",
        type: "choice",
        prompt: "A soda bottle feels lighter after you open it and gas escapes. Why?",
        choices: [
          "Mass was destroyed",
          "Some mass left as gas",
          "Gravity turned off",
          "The liquid lost volume only, never mass",
        ],
        correctIndex: 1,
        explanation: "Gas molecules left the bottle, so the bottle’s remaining mass dropped.",
      },
      {
        id: "mass5",
        type: "choice",
        prompt: "Best investigation setup to test conservation of mass:",
        choices: [
          "Open window while heating",
          "Sealed bag on a scale before and after a reaction",
          "Guess without measuring",
          "Only observe color change",
        ],
        correctIndex: 1,
        explanation: "A closed system plus measuring mass before/after is the fair test.",
      },
    ],
  },

  "187_SCI_SPHERES": {
    unitTag: "187_SCI_SPHERES",
    title: "Earth’s Four Spheres",
    teach: [
      "Geosphere: rocks, soil, landforms, Earth’s interior.",
      "Hydrosphere: all water — oceans, rivers, ice, groundwater.",
      "Atmosphere: the layer of gases around Earth.",
      "Biosphere: all living things and the places they live.",
      "The spheres interact constantly (rain weathers rock; plants use air and water).",
    ],
    tip: "Geo = Earth/rock, Hydro = water, Atmo = air, Bio = life.",
    passPercent: 70,
    questions: [
      {
        id: "sph1",
        type: "choice",
        prompt: "Oceans and rivers are part of the:",
        choices: ["Geosphere", "Hydrosphere", "Atmosphere", "Only the biosphere"],
        correctIndex: 1,
        explanation: "Hydrosphere = Earth’s water.",
      },
      {
        id: "sph2",
        type: "choice",
        prompt: "Mountains and soil belong mainly to the:",
        choices: ["Atmosphere", "Hydrosphere", "Geosphere", "Only clouds"],
        correctIndex: 2,
        explanation: "Geosphere includes solid Earth materials.",
      },
      {
        id: "sph3",
        type: "short",
        prompt: "Which sphere includes plants, animals, and people? (name it)",
        accepted: ["biosphere"],
        explanation: "Biosphere = living things.",
      },
      {
        id: "sph4",
        type: "choice",
        prompt: "Rain weathering a rock is an interaction between:",
        choices: [
          "Only the atmosphere with itself",
          "Hydrosphere and geosphere",
          "Two biospheres",
          "Space and the Moon only",
        ],
        correctIndex: 1,
        explanation: "Water (hydro) changes rock (geo).",
      },
      {
        id: "sph5",
        type: "choice",
        prompt: "The air we breathe is part of the:",
        choices: ["Geosphere", "Hydrosphere", "Atmosphere", "Mantle only"],
        correctIndex: 2,
        explanation: "Atmosphere is Earth’s gas layer.",
      },
    ],
  },

  "187_SS_MAPS": {
    unitTag: "187_SS_MAPS",
    title: "Western Hemisphere Mapping",
    teach: [
      "The Western Hemisphere includes North America and South America (and nearby waters).",
      "Use a map key/legend, compass rose, and scale to read maps.",
      "Major features: Rocky Mountains, Andes, Amazon River, Mississippi River, Great Lakes.",
      "Countries to know: United States, Canada, Mexico, Brazil, and others in the Americas.",
    ],
    tip: "North is up on most classroom maps — check the compass rose to be sure.",
    passPercent: 70,
    questions: [
      {
        id: "map1",
        type: "choice",
        prompt: "Which continents are the main landmasses of the Western Hemisphere?",
        choices: [
          "Europe and Asia",
          "Africa and Australia",
          "North America and South America",
          "Antarctica only",
        ],
        correctIndex: 2,
        explanation: "The Americas dominate the Western Hemisphere.",
      },
      {
        id: "map2",
        type: "choice",
        prompt: "The Amazon River is mainly in:",
        choices: ["Canada", "South America", "Europe", "Australia"],
        correctIndex: 1,
        explanation: "The Amazon flows through South America, largely Brazil.",
      },
      {
        id: "map3",
        type: "short",
        prompt: "What map feature shows direction (N, S, E, W)?",
        accepted: ["compass rose", "compass", "compassrose"],
        explanation: "A compass rose shows cardinal directions.",
      },
      {
        id: "map4",
        type: "choice",
        prompt: "The Andes mountains run along which coast of South America?",
        choices: ["East", "West", "Only the north pole", "Only underwater"],
        correctIndex: 1,
        explanation: "The Andes stretch along the western edge of South America.",
      },
      {
        id: "map5",
        type: "choice",
        prompt: "A map scale helps you:",
        choices: [
          "Color the ocean blue",
          "Measure real distance from map distance",
          "Name the map author only",
          "Find the temperature",
        ],
        correctIndex: 1,
        explanation: "Scale converts map measurements to real-world distances.",
      },
    ],
  },

  "187_SS_HISTORY": {
    unitTag: "187_SS_HISTORY",
    title: "Maya, Aztec, and Inca",
    teach: [
      "Maya: city-states in Mesoamerica; advanced writing, calendar, and math; stepped pyramids.",
      "Aztec: powerful empire in central Mexico; capital Tenochtitlán on a lake; tribute system.",
      "Inca: Andes empire in South America; road network; terrace farming; no written system like Maya glyphs — used quipu.",
      "Compare location, achievements, and how they adapted to their environment.",
    ],
    tip: "Maya → writing/calendar; Aztec → Tenochtitlán; Inca → Andes roads & terraces.",
    passPercent: 70,
    questions: [
      {
        id: "hist1",
        type: "choice",
        prompt: "Which civilization built Tenochtitlán?",
        choices: ["Maya", "Aztec", "Inca", "Vikings"],
        correctIndex: 1,
        explanation: "Tenochtitlán was the Aztec capital.",
      },
      {
        id: "hist2",
        type: "choice",
        prompt: "Which civilization is most associated with the Andes Mountains?",
        choices: ["Inca", "Aztec", "Maya", "Egyptians"],
        correctIndex: 0,
        explanation: "The Inca empire stretched along the Andes.",
      },
      {
        id: "hist3",
        type: "short",
        prompt: "Which civilization is known for a complex writing system and calendar? (Maya/Aztec/Inca)",
        accepted: ["maya", "the maya", "mayans"],
        explanation: "The Maya developed glyph writing and sophisticated calendars.",
      },
      {
        id: "hist4",
        type: "choice",
        prompt: "Terrace farming helped the Inca:",
        choices: [
          "Sail across the Atlantic",
          "Grow crops on steep mountainsides",
          "Build ships from gold",
          "Live only in deserts",
        ],
        correctIndex: 1,
        explanation: "Terraces created flat planting areas on slopes.",
      },
      {
        id: "hist5",
        type: "choice",
        prompt: "A quipu was used by the Inca mainly to:",
        choices: [
          "Cook food",
          "Record information with knotted cords",
          "Build pyramids in Egypt",
          "Paint murals only",
        ],
        correctIndex: 1,
        explanation: "Quipus stored data with knots on strings.",
      },
    ],
  },

  "187_READ_LOG": {
    unitTag: "187_READ_LOG",
    title: "Strong Reading Habits",
    teach: [
      "A reading log tracks time, pages, and what you understood.",
      "Good readers pause to ask questions and summarize in their own words.",
      "Thirty focused minutes beats rushing through pages you don’t remember.",
      "Write one key event and one new word each session.",
    ],
    tip: "After reading, tell someone the main idea in two sentences.",
    passPercent: 70,
    questions: [
      {
        id: "read1",
        type: "choice",
        prompt: "What belongs in a useful reading log?",
        choices: [
          "Only the book color",
          "Date, time spent, pages, and a short summary",
          "A drawing with no words ever",
          "Someone else’s scores",
        ],
        correctIndex: 1,
        explanation: "Logs should capture effort and understanding.",
      },
      {
        id: "read2",
        type: "choice",
        prompt: "Best move when a paragraph is confusing:",
        choices: [
          "Skip the whole book forever",
          "Reread slowly and check for key words",
          "Guess randomly and move on",
          "Close your eyes and wait",
        ],
        correctIndex: 1,
        explanation: "Rereading and hunting for key words builds comprehension.",
      },
      {
        id: "read3",
        type: "short",
        prompt: "About how many focused minutes a day does this quest recommend? (number)",
        accepted: ["30", "thirty"],
        explanation: "The weekly log goal is about 30 minutes a day.",
      },
      {
        id: "read4",
        type: "choice",
        prompt: "A strong summary includes:",
        choices: [
          "Every single sentence copied",
          "Main idea + important details in your own words",
          "Only funny jokes",
          "Nothing about characters",
        ],
        correctIndex: 1,
        explanation: "Summaries capture the big idea without copying everything.",
      },
      {
        id: "read5",
        type: "choice",
        prompt: "Why track new vocabulary while reading?",
        choices: [
          "It slows you down for no reason",
          "New words help you understand harder books later",
          "Teachers dislike word lists",
          "Words never repeat",
        ],
        correctIndex: 1,
        explanation: "Vocabulary growth unlocks more complex texts.",
      },
    ],
  },
};

export function lessonForUnit(unitTag: string | null | undefined): Lesson | null {
  if (!unitTag) return null;
  return LESSONS[unitTag] ?? null;
}
