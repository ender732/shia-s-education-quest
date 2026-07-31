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
  /** Crash Course Kids (or related) YouTube video id when a strong match exists. */
  youtubeVideoId?: string;
  /** Accessible label for the embed. */
  youtubeTitle?: string;
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
      "Volume measures how much space a solid takes up (NY-5.MD.3–5).",
      "For a rectangular prism: V = length × width × height (or V = B × h).",
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

  "187_MATH_POWERS10": {
    unitTag: "187_MATH_POWERS10",
    title: "Powers of 10 & Place Value",
    teach: [
      "Grade 5 (NY-5.NBT.1–2): each place is 10 times the place to its right.",
      "Multiplying by 10, 100, or 1,000 shifts digits left; dividing shifts right.",
      "10¹ = 10, 10² = 100, 10³ = 1,000 — exponents count the zeros for powers of 10.",
      "Example: 3.45 × 100 = 345 because the decimal point moves two places right.",
    ],
    tip: "Count the zeros in the power of 10 — that is how many places the decimal moves.",
    passPercent: 70,
    questions: [
      {
        id: "p101",
        type: "choice",
        prompt: "What is 10³?",
        choices: ["30", "100", "1,000", "10,000"],
        correctIndex: 2,
        explanation: "10³ = 10 × 10 × 10 = 1,000.",
      },
      {
        id: "p102",
        type: "short",
        prompt: "Compute 4.2 × 100. Number only.",
        accepted: ["420"],
        explanation: "Moving the decimal two places right: 4.20 → 420.",
      },
      {
        id: "p103",
        type: "choice",
        prompt: "Which place is 10 times greater than the tenths place?",
        choices: ["Hundredths", "Ones", "Thousandths", "Tens"],
        correctIndex: 1,
        explanation: "Ones are 10 times tenths (1 = 10 × 0.1).",
      },
      {
        id: "p104",
        type: "short",
        prompt: "What is 560 ÷ 10?",
        accepted: ["56"],
        explanation: "Dividing by 10 shifts digits one place right: 560 → 56.",
      },
      {
        id: "p105",
        type: "choice",
        prompt: "6.07 × 1,000 equals:",
        choices: ["60.7", "607", "6,070", "67"],
        correctIndex: 2,
        explanation: "Three places right: 6.070 → 6,070.",
      },
    ],
  },

  "187_MATH_DECIMAL_OPS": {
    unitTag: "187_MATH_DECIMAL_OPS",
    title: "Decimal Operations to Hundredths",
    teach: [
      "NY-5.NBT.7: add, subtract, multiply, and divide decimals to hundredths.",
      "Line up decimal points for +/−. Keep the decimal in the sum or difference.",
      "For multiplication, multiply as whole numbers, then place the decimal by counting total decimal places.",
      "For division, you can rewrite as an equivalent problem with whole-number divisors when helpful.",
    ],
    tip: "Estimate first: 2.4 × 3 should be near 7, not 70.",
    passPercent: 70,
    questions: [
      {
        id: "dop1",
        type: "short",
        prompt: "What is 3.25 + 1.4?",
        accepted: ["4.65"],
        explanation: "3.25 + 1.40 = 4.65.",
      },
      {
        id: "dop2",
        type: "choice",
        prompt: "What is 5.6 − 2.35?",
        choices: ["3.25", "3.35", "2.25", "3.15"],
        correctIndex: 0,
        explanation: "5.60 − 2.35 = 3.25.",
      },
      {
        id: "dop3",
        type: "short",
        prompt: "Compute 1.5 × 4.",
        accepted: ["6", "6.0"],
        explanation: "1.5 × 4 = 6.",
      },
      {
        id: "dop4",
        type: "choice",
        prompt: "0.6 × 0.3 equals:",
        choices: ["1.8", "0.18", "0.09", "18"],
        correctIndex: 1,
        explanation: "6 × 3 = 18; two decimal places → 0.18.",
      },
      {
        id: "dop5",
        type: "short",
        prompt: "What is 4.8 ÷ 2?",
        accepted: ["2.4"],
        explanation: "4.8 ÷ 2 = 2.4.",
      },
    ],
  },

  "187_MATH_FRAC_MULT": {
    unitTag: "187_MATH_FRAC_MULT",
    title: "Multiply & Divide Fractions",
    teach: [
      "NY-5.NF: multiply fractions and whole numbers; divide in limited cases.",
      "To multiply fractions: multiply numerators, multiply denominators, then simplify.",
      "A whole number times a fraction: write the whole number as a fraction over 1.",
      "Limited division: unit fraction ÷ whole number, or whole number ÷ unit fraction (not fraction ÷ fraction until Grade 6).",
    ],
    tip: "1/2 × 1/3 = 1/6. Of means multiply: 1/2 of 12 = 6.",
    passPercent: 70,
    questions: [
      {
        id: "fm1",
        type: "short",
        prompt: "What is 1/2 × 1/4? Simplified fraction.",
        accepted: ["1/8"],
        explanation: "1×1 / 2×4 = 1/8.",
      },
      {
        id: "fm2",
        type: "choice",
        prompt: "What is 3 × 2/5?",
        choices: ["5/6", "6/5", "2/15", "6/15"],
        correctIndex: 1,
        explanation: "3/1 × 2/5 = 6/5.",
      },
      {
        id: "fm3",
        type: "short",
        prompt: "What is 1/2 of 10? Number only.",
        accepted: ["5"],
        explanation: "1/2 × 10 = 5.",
      },
      {
        id: "fm4",
        type: "choice",
        prompt: "1/3 ÷ 4 means:",
        choices: [
          "Split 1/3 into 4 equal parts",
          "Multiply 1/3 by 4",
          "Add 1/3 four times",
          "Subtract 4 from 1/3",
        ],
        correctIndex: 0,
        explanation: "Dividing a unit fraction by a whole number splits it into that many equal parts: 1/12.",
      },
      {
        id: "fm5",
        type: "short",
        prompt: "What is 1/3 ÷ 4 as a fraction?",
        accepted: ["1/12"],
        explanation: "1/3 ÷ 4 = 1/3 × 1/4 = 1/12.",
      },
    ],
  },

  "187_MATH_DIV_2DIGIT": {
    unitTag: "187_MATH_DIV_2DIGIT",
    title: "Division with 2-Digit Divisors",
    teach: [
      "NY-5.NBT.6: find whole-number quotients with up to 4-digit dividends and 2-digit divisors.",
      "Estimate first using compatible numbers (e.g., 480 ÷ 20).",
      "Use place value, area models, or the standard algorithm — check with multiplication.",
      "Remainders matter: sometimes you leave a remainder; sometimes you express as a fraction or decimal later.",
    ],
    tip: "Check: quotient × divisor + remainder should equal the dividend.",
    passPercent: 70,
    questions: [
      {
        id: "d21",
        type: "short",
        prompt: "What is 480 ÷ 20?",
        accepted: ["24"],
        explanation: "20 × 24 = 480.",
      },
      {
        id: "d22",
        type: "choice",
        prompt: "Best estimate for 612 ÷ 28?",
        choices: ["About 10", "About 20", "About 40", "About 100"],
        correctIndex: 1,
        explanation: "600 ÷ 30 = 20 is a close compatible-number estimate.",
      },
      {
        id: "d23",
        type: "short",
        prompt: "What is 156 ÷ 12?",
        accepted: ["13"],
        explanation: "12 × 13 = 156.",
      },
      {
        id: "d24",
        type: "choice",
        prompt: "365 ÷ 15 = 24 R5. What does R5 mean?",
        choices: [
          "The divisor is 5",
          "5 is left over after making 24 groups of 15",
          "The answer is only 5",
          "You should ignore it",
        ],
        correctIndex: 1,
        explanation: "24 × 15 = 360; 5 remains.",
      },
      {
        id: "d25",
        type: "short",
        prompt: "What is 900 ÷ 25?",
        accepted: ["36"],
        explanation: "25 × 36 = 900.",
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

  "187_ELA_MAIN_IDEA": {
    unitTag: "187_ELA_MAIN_IDEA",
    title: "Main Idea & Text Evidence",
    teach: [
      "NYS Grade 5 reading: determine a main idea and explain how details support it.",
      "The main idea is what the text is mostly about — not just one interesting fact.",
      "Supporting details prove or explain the main idea with examples, facts, or events.",
      "Quote or paraphrase evidence, then tell why it matters.",
    ],
    tip: "If a detail can be removed and the big idea still stands, it may not be central.",
    passPercent: 70,
    questions: [
      {
        id: "mi1",
        type: "choice",
        prompt: "A main idea is:",
        choices: [
          "The longest sentence in a paragraph",
          "What the text is mostly about",
          "Any fun fact",
          "The author’s middle name",
        ],
        correctIndex: 1,
        explanation: "Main idea = the central message or focus of the passage.",
      },
      {
        id: "mi2",
        type: "choice",
        prompt: "Which is the best supporting detail for “Bees help plants reproduce”?",
        choices: [
          "Bees are yellow and black",
          "Bees carry pollen from flower to flower",
          "Some people fear bees",
          "Honey tastes sweet",
        ],
        correctIndex: 1,
        explanation: "Pollen transfer directly supports how bees help plants reproduce.",
      },
      {
        id: "mi3",
        type: "short",
        prompt: "Fill in: Details that prove the main idea are called ____ evidence.",
        accepted: ["text", "supporting", "textual"],
        explanation: "Text / supporting evidence backs the main idea.",
        placeholder: "text / supporting",
      },
      {
        id: "mi4",
        type: "choice",
        prompt: "Best way to cite evidence:",
        choices: [
          "Make up a quote",
          "Use words or details from the passage",
          "Only give your opinion",
          "Ignore the text",
        ],
        correctIndex: 1,
        explanation: "Evidence must come from the text.",
      },
      {
        id: "mi5",
        type: "choice",
        prompt: "A paragraph lists three ways recycling helps Earth. Main idea is closest to:",
        choices: [
          "Plastic bottles are round",
          "Recycling helps the environment in several ways",
          "Thursday is trash day",
          "People like blue bins",
        ],
        correctIndex: 1,
        explanation: "The details all support recycling’s environmental benefits.",
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
    youtubeVideoId: "ZZYnERZe3Cg",
    youtubeTitle: "Hunting for Properties: Crash Course Kids #9.1",
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
    youtubeVideoId: "3lHHOiTdmK4",
    youtubeTitle: "Vacation or Conservation (Of Mass): Crash Course Kids #23.1",
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
    youtubeVideoId: "VMxjzWHbyFM",
    youtubeTitle: "Four Spheres Part 1 (Geo and Bio): Crash Course Kids #6.1",
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

  "187_SCI_ECOSYSTEMS": {
    unitTag: "187_SCI_ECOSYSTEMS",
    title: "Matter & Energy in Ecosystems",
    teach: [
      "NYSSLS 5-LS: plants get materials for growth mainly from air and water — not soil alone.",
      "Matter cycles among producers (plants), consumers (animals), decomposers, and the environment.",
      "Food webs show how energy and matter move through living things.",
      "When organisms die, decomposers return matter to soil, water, and air.",
    ],
    tip: "Producers make their own food; consumers eat; decomposers recycle.",
    passPercent: 70,
    questions: [
      {
        id: "eco1",
        type: "choice",
        prompt: "Where do plants get most materials for growth?",
        choices: ["Only from soil minerals", "Mostly air and water", "Only from sunlight heat", "From rocks alone"],
        correctIndex: 1,
        explanation: "5-LS1-1: plants primarily use air and water for growth materials.",
      },
      {
        id: "eco2",
        type: "choice",
        prompt: "In a food web, plants are usually:",
        choices: ["Decomposers", "Producers", "Only consumers", "Nonliving"],
        correctIndex: 1,
        explanation: "Plants produce food using sunlight.",
      },
      {
        id: "eco3",
        type: "short",
        prompt: "Organisms that break down dead matter are called ____.",
        accepted: ["decomposers", "decomposer"],
        explanation: "Decomposers recycle matter back into the environment.",
      },
      {
        id: "eco4",
        type: "choice",
        prompt: "Matter moving among plants, animals, and the environment is called:",
        choices: ["Cycling of matter", "Only gravity", "Magnetism", "Evaporation only"],
        correctIndex: 0,
        explanation: "5-LS2-1 focuses on cycling of matter in ecosystems.",
      },
      {
        id: "eco5",
        type: "choice",
        prompt: "A rabbit eats grass. The rabbit is a:",
        choices: ["Producer", "Consumer", "Decomposer only", "Star"],
        correctIndex: 1,
        explanation: "Animals that eat plants or other animals are consumers.",
      },
    ],
  },

  "187_SCI_STARS": {
    unitTag: "187_SCI_STARS",
    title: "Stars & Relative Brightness",
    teach: [
      "NYSSLS 5-ESS1: stars range widely in distance and size; brightness as seen from Earth depends on both.",
      "Our Sun is a star — closer than other stars, so it looks much brighter.",
      "A star that is farther away can look dimmer even if it is larger than the Sun.",
      "Daily patterns (day/night) come from Earth’s rotation; seasonal patterns relate to Earth’s orbit and tilt.",
    ],
    tip: "Apparent brightness ≠ true size. Distance matters a lot.",
    passPercent: 70,
    questions: [
      {
        id: "star1",
        type: "choice",
        prompt: "Why does the Sun look so bright from Earth?",
        choices: [
          "It is the only star that exists",
          "It is much closer than other stars",
          "It is made of plastic",
          "It never produces light",
        ],
        correctIndex: 1,
        explanation: "Distance makes the Sun appear brightest from Earth.",
      },
      {
        id: "star2",
        type: "choice",
        prompt: "Two stars look different in brightness. That can mean:",
        choices: [
          "Only that one is made of water",
          "Differences in distance and/or actual size/energy",
          "Stars have no light",
          "Brightness never changes with distance",
        ],
        correctIndex: 1,
        explanation: "Apparent brightness depends on distance and the star’s properties.",
      },
      {
        id: "star3",
        type: "short",
        prompt: "The star at the center of our solar system is the ____.",
        accepted: ["sun", "the sun"],
        explanation: "The Sun is our nearest star.",
      },
      {
        id: "star4",
        type: "choice",
        prompt: "Day and night are mainly caused by:",
        choices: [
          "Earth rotating on its axis",
          "The Moon turning off the Sun",
          "Clouds only",
          "Stars blinking",
        ],
        correctIndex: 0,
        explanation: "Earth’s rotation creates day/night patterns.",
      },
      {
        id: "star5",
        type: "choice",
        prompt: "A larger star farther away may look dimmer than a smaller nearby star because:",
        choices: [
          "Distance affects how bright it appears",
          "Large stars never shine",
          "Earth blocks all far stars equally",
          "Telescopes invent brightness",
        ],
        correctIndex: 0,
        explanation: "Greater distance reduces apparent brightness.",
      },
    ],
  },

  "187_SCI_WATER": {
    unitTag: "187_SCI_WATER",
    title: "Water on Earth",
    teach: [
      "NYSSLS 5-ESS2-2: most of Earth’s water is in the ocean (salt water).",
      "Fresh water is a much smaller share — found in glaciers/ice, groundwater, lakes, and rivers.",
      "Graphs and percentages help compare reservoirs of water.",
      "Protecting fresh water matters because usable fresh water is limited.",
    ],
    tip: "Ocean ≈ nearly all water; drinkable fresh water is only a tiny slice.",
    passPercent: 70,
    questions: [
      {
        id: "wat1",
        type: "choice",
        prompt: "Most of Earth’s water is:",
        choices: ["Fresh lake water", "Salt water in oceans", "Only in clouds", "Only in faucets"],
        correctIndex: 1,
        explanation: "Oceans hold the vast majority of Earth’s water.",
      },
      {
        id: "wat2",
        type: "choice",
        prompt: "Which is a fresh-water reservoir?",
        choices: ["Open ocean", "Glaciers and ice", "Only magma", "Outer space"],
        correctIndex: 1,
        explanation: "Glaciers/ice store a large part of Earth’s fresh water.",
      },
      {
        id: "wat3",
        type: "short",
        prompt: "Water beneath Earth’s surface in soil and rock cracks is called ____ water.",
        accepted: ["ground", "groundwater", "ground water"],
        explanation: "Groundwater is a key fresh-water reservoir.",
      },
      {
        id: "wat4",
        type: "choice",
        prompt: "Why do scientists graph water percentages?",
        choices: [
          "To compare amounts in different reservoirs",
          "To measure wind only",
          "To name planets",
          "To replace the water cycle",
        ],
        correctIndex: 0,
        explanation: "Graphs show how water is distributed across Earth.",
      },
      {
        id: "wat5",
        type: "choice",
        prompt: "Compared with ocean water, usable fresh water is:",
        choices: ["Much more abundant", "About the same", "A much smaller portion", "Not real"],
        correctIndex: 2,
        explanation: "Fresh water is a small fraction of total water on Earth.",
      },
    ],
  },

  "187_SS_MAPS": {
    unitTag: "187_SS_MAPS",
    title: "Geography of the Western Hemisphere",
    teach: [
      "Passport Grade 5 Unit 1: geography of the Western Hemisphere.",
      "The Western Hemisphere includes North America and South America (and nearby waters).",
      "Use a map key/legend, compass rose, and scale to read maps.",
      "Major features: Rocky Mountains, Andes, Amazon River, Mississippi River, Great Lakes.",
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
    title: "Early Societies: Maya, Aztec, Inca",
    teach: [
      "Passport Grade 5 Unit 1 includes early societies of the Western Hemisphere.",
      "Maya: city-states in Mesoamerica; advanced writing, calendar, and math; stepped pyramids.",
      "Aztec: empire in central Mexico; capital Tenochtitlán; tribute system.",
      "Inca: Andes empire; roads, terrace farming, quipu record-keeping.",
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

  "187_SS_EXPLORATION": {
    unitTag: "187_SS_EXPLORATION",
    title: "European Exploration",
    teach: [
      "Passport Grade 5 Unit 2: European exploration of the Western Hemisphere.",
      "Explorers sought new trade routes, wealth, and land claims for European nations.",
      "Contact brought exchange of goods, ideas, plants, and animals — and also disease, conflict, and conquest.",
      "Indigenous peoples already lived throughout the Americas with rich cultures and governments.",
    ],
    tip: "Ask: Who benefited? Who was harmed? What changed for people already living here?",
    passPercent: 70,
    questions: [
      {
        id: "exp1",
        type: "choice",
        prompt: "A major reason Europeans explored the Americas was to:",
        choices: [
          "Avoid all trade forever",
          "Find new trade routes, wealth, and land claims",
          "Prove the Earth was flat",
          "Escape all maps",
        ],
        correctIndex: 1,
        explanation: "Nations competed for trade, resources, and territory.",
      },
      {
        id: "exp2",
        type: "choice",
        prompt: "Before Europeans arrived, the Americas were:",
        choices: [
          "Empty of people",
          "Home to many Indigenous nations and cultures",
          "Only ice with no societies",
          "Ruled only by Australia",
        ],
        correctIndex: 1,
        explanation: "Diverse Indigenous societies lived across the hemisphere.",
      },
      {
        id: "exp3",
        type: "short",
        prompt: "The widespread transfer of plants, animals, and diseases between hemispheres is often called the Columbian ____.",
        accepted: ["exchange"],
        explanation: "The Columbian Exchange reshaped diets, economies, and populations.",
      },
      {
        id: "exp4",
        type: "choice",
        prompt: "European colonization often led to:",
        choices: [
          "No change for anyone",
          "Land claims, cultural conflict, and huge impacts on Indigenous peoples",
          "Only friendship treaties that never broke",
          "The end of all farming",
        ],
        correctIndex: 1,
        explanation: "Exploration and colonization transformed power, land, and lives.",
      },
      {
        id: "exp5",
        type: "choice",
        prompt: "Studying exploration from multiple perspectives means:",
        choices: [
          "Only reading one explorer’s diary",
          "Including Indigenous and European viewpoints",
          "Ignoring primary sources",
          "Skipping maps",
        ],
        correctIndex: 1,
        explanation: "Passport civics/history asks students to consider multiple perspectives.",
      },
    ],
  },

  "187_SS_US": {
    unitTag: "187_SS_US",
    title: "Case Study: United States",
    teach: [
      "Passport case study: United States in the Western Hemisphere.",
      "Geography shapes life: coasts, rivers, plains, mountains, and varied climates.",
      "The U.S. is a representative democracy with federal and state governments.",
      "Immigration and cultural diversity are central to U.S. history and communities today.",
    ],
    tip: "Connect physical features (Mississippi, Rockies) to how people live and work.",
    passPercent: 70,
    questions: [
      {
        id: "us1",
        type: "choice",
        prompt: "The United States is best described as:",
        choices: [
          "A single city with no states",
          "A large country in North America with diverse regions",
          "Only an island in the Pacific",
          "A country with no government",
        ],
        correctIndex: 1,
        explanation: "The U.S. spans varied geography across North America.",
      },
      {
        id: "us2",
        type: "choice",
        prompt: "A representative democracy means citizens:",
        choices: [
          "Never vote",
          "Elect leaders to make decisions",
          "Have no rights",
          "Only obey a king",
        ],
        correctIndex: 1,
        explanation: "Voters choose representatives who make laws.",
      },
      {
        id: "us3",
        type: "short",
        prompt: "Name the major river that runs south through the central United States (one word).",
        accepted: ["mississippi", "mississippi river"],
        explanation: "The Mississippi is a key U.S. waterway.",
      },
      {
        id: "us4",
        type: "choice",
        prompt: "Why do case studies matter in Grade 5 Social Studies?",
        choices: [
          "To memorize only flags",
          "To deeply study how geography, history, and government shape a country",
          "To skip reading",
          "To avoid maps",
        ],
        correctIndex: 1,
        explanation: "Passport uses case studies for deeper country analysis.",
      },
      {
        id: "us5",
        type: "choice",
        prompt: "Cultural diversity in the U.S. is largely shaped by:",
        choices: [
          "Only one language forever",
          "Immigration and many cultural traditions",
          "Having no neighbors",
          "Avoiding cities",
        ],
        correctIndex: 1,
        explanation: "Waves of immigration and Indigenous nations create a diverse society.",
      },
    ],
  },

  "187_SS_DR": {
    unitTag: "187_SS_DR",
    title: "Case Study: Dominican Republic",
    teach: [
      "Passport case study: Dominican Republic (Caribbean / Western Hemisphere).",
      "It shares the island of Hispaniola with Haiti.",
      "Tropical climate supports agriculture (sugar, coffee, cacao) and tourism.",
      "History includes Taíno peoples, European colonization, and independence struggles.",
    ],
    tip: "Island geography + Caribbean location = climate, trade, and culture connections.",
    passPercent: 70,
    questions: [
      {
        id: "dr1",
        type: "choice",
        prompt: "The Dominican Republic shares Hispaniola with:",
        choices: ["Canada", "Haiti", "Brazil", "Alaska"],
        correctIndex: 1,
        explanation: "Haiti and the Dominican Republic share Hispaniola.",
      },
      {
        id: "dr2",
        type: "choice",
        prompt: "The Dominican Republic is located in the:",
        choices: ["Arctic Ocean only", "Caribbean", "Himalayas", "Australian Outback"],
        correctIndex: 1,
        explanation: "It is a Caribbean nation in the Western Hemisphere.",
      },
      {
        id: "dr3",
        type: "short",
        prompt: "A major industry that brings visitors to enjoy beaches and culture is ____.",
        accepted: ["tourism", "tourists", "tourist industry"],
        explanation: "Tourism is important to the Dominican economy.",
      },
      {
        id: "dr4",
        type: "choice",
        prompt: "Indigenous people of the island before European arrival included the:",
        choices: ["Taíno", "Inuit only", "Maori only", "Samurai"],
        correctIndex: 0,
        explanation: "Taíno peoples lived in the Caribbean, including Hispaniola.",
      },
      {
        id: "dr5",
        type: "choice",
        prompt: "Studying the D.R. helps Grade 5 students understand:",
        choices: [
          "Only European capitals",
          "Caribbean geography, culture, and history in the Western Hemisphere",
          "Desert nations only",
          "Space colonies",
        ],
        correctIndex: 1,
        explanation: "It is one of Passport’s required country case studies.",
      },
    ],
  },

  "187_SS_MEXICO": {
    unitTag: "187_SS_MEXICO",
    title: "Case Study: Mexico",
    teach: [
      "Passport case study: Mexico — neighbor to the United States in North America.",
      "Diverse geography: deserts, mountains, coasts, and highlands.",
      "Deep Indigenous heritage (including Aztec and Maya regions) plus Spanish colonial history.",
      "Today Mexico is a federal republic with rich arts, food traditions, and trade links.",
    ],
    tip: "Connect Mexico’s past civilizations to its regions and modern identity.",
    passPercent: 70,
    questions: [
      {
        id: "mx1",
        type: "choice",
        prompt: "Mexico borders the United States to Mexico’s:",
        choices: ["South", "North", "Only east across the Atlantic", "Only Antarctica"],
        correctIndex: 1,
        explanation: "The U.S.–Mexico border is along Mexico’s north.",
      },
      {
        id: "mx2",
        type: "choice",
        prompt: "Tenochtitlán (Aztec capital) was located in what is now:",
        choices: ["Canada", "Mexico", "Portugal", "Egypt"],
        correctIndex: 1,
        explanation: "Mexico City grew near the historic Aztec capital site.",
      },
      {
        id: "mx3",
        type: "short",
        prompt: "Mexico is part of which continent? (two words)",
        accepted: ["north america", "northamerica"],
        explanation: "Mexico is in North America.",
      },
      {
        id: "mx4",
        type: "choice",
        prompt: "Spanish colonization in Mexico led to:",
        choices: [
          "No cultural change",
          "Major cultural, language, and religious changes over time",
          "Mexico moving to Europe",
          "The Andes disappearing",
        ],
        correctIndex: 1,
        explanation: "Colonial history reshaped language, religion, and society.",
      },
      {
        id: "mx5",
        type: "choice",
        prompt: "Why is Mexico a Passport case study?",
        choices: [
          "It is outside the Western Hemisphere",
          "It shows geography, Indigenous history, and modern nationhood in the Americas",
          "It has no history",
          "It is only a myth",
        ],
        correctIndex: 1,
        explanation: "Mexico is a core Grade 5 Western Hemisphere case study.",
      },
    ],
  },

  "187_SS_CANADA": {
    unitTag: "187_SS_CANADA",
    title: "Case Study: Canada",
    teach: [
      "Passport case study: Canada — large northern neighbor of the United States.",
      "Geography includes vast forests, tundra, lakes, and the Canadian Shield.",
      "Canada is a constitutional monarchy / parliamentary democracy within the Commonwealth.",
      "Indigenous Nations, English and French heritage, and immigration shape Canadian society.",
    ],
    tip: "Think climate and latitude: much of Canada is colder than most of the U.S.",
    passPercent: 70,
    questions: [
      {
        id: "ca1",
        type: "choice",
        prompt: "Canada is located mainly:",
        choices: [
          "South of the United States",
          "North of the contiguous United States",
          "Only in South America",
          "In Antarctica",
        ],
        correctIndex: 1,
        explanation: "Canada borders the U.S. to the north.",
      },
      {
        id: "ca2",
        type: "choice",
        prompt: "Two official languages of Canada include English and:",
        choices: ["Portuguese", "French", "Japanese", "Swahili"],
        correctIndex: 1,
        explanation: "English and French are Canada’s official languages.",
      },
      {
        id: "ca3",
        type: "short",
        prompt: "Canada’s form of national legislature/government tradition is often called ____ democracy (one word).",
        accepted: ["parliamentary", "parliament"],
        explanation: "Canada uses a parliamentary system.",
      },
      {
        id: "ca4",
        type: "choice",
        prompt: "Indigenous peoples in Canada:",
        choices: [
          "Have no history there",
          "Include First Nations, Inuit, and Métis peoples with deep roots",
          "Arrived only last year",
          "Live only in Europe",
        ],
        correctIndex: 1,
        explanation: "Indigenous Nations are foundational to Canada’s story.",
      },
      {
        id: "ca5",
        type: "choice",
        prompt: "A geographic challenge in much of northern Canada is:",
        choices: [
          "Always tropical beaches",
          "Harsh cold climates and sparse settlement",
          "No freshwater anywhere",
          "Being underwater year-round",
        ],
        correctIndex: 1,
        explanation: "Northern regions are cold with fewer people.",
      },
    ],
  },

  "187_SS_TODAY": {
    unitTag: "187_SS_TODAY",
    title: "The Western Hemisphere Today",
    teach: [
      "Passport Unit 4: contemporary issues across the Western Hemisphere.",
      "Countries are linked by trade, migration, environment, and diplomacy.",
      "Challenges can include inequality, climate impacts, and protecting rights.",
      "Citizens and governments make choices that affect communities locally and globally.",
    ],
    tip: "Use a current event and ask: Who is affected? What choices do leaders and citizens have?",
    passPercent: 70,
    questions: [
      {
        id: "tod1",
        type: "choice",
        prompt: "“Western Hemisphere today” lessons focus on:",
        choices: [
          "Only dinosaurs",
          "Current issues connecting nations in the Americas",
          "Only ancient Rome",
          "Space travel rules only",
        ],
        correctIndex: 1,
        explanation: "Unit 4 examines modern connections and challenges.",
      },
      {
        id: "tod2",
        type: "choice",
        prompt: "Trade between countries means:",
        choices: [
          "Never exchanging goods",
          "Buying and selling goods and services across borders",
          "Closing all ports forever",
          "Only exchanging stamps",
        ],
        correctIndex: 1,
        explanation: "International trade links economies in the hemisphere.",
      },
      {
        id: "tod3",
        type: "short",
        prompt: "People moving from one country to another to live is called ____.",
        accepted: ["migration", "immigration", "emigration"],
        explanation: "Migration/immigration shapes communities across the Americas.",
      },
      {
        id: "tod4",
        type: "choice",
        prompt: "An environmental issue that can cross borders is:",
        choices: [
          "Climate change and pollution",
          "Only one town’s recess schedule",
          "A single classroom desk",
          "A pencil’s brand name",
        ],
        correctIndex: 0,
        explanation: "Climate and pollution affect many countries.",
      },
      {
        id: "tod5",
        type: "choice",
        prompt: "Civics in this unit asks students to think about:",
        choices: [
          "How citizens and governments respond to shared problems",
          "Ignoring all news",
          "Memorizing only sports scores",
          "Avoiding maps",
        ],
        correctIndex: 0,
        explanation: "Passport emphasizes citizenship and decision-making.",
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

/** All practice unit tags aligned to NYC Grade 5 / Hudson Cliffs. */
export const CURRICULUM_UNIT_TAGS = Object.keys(LESSONS);

