/**
 * Expanded curated YouTube catalog (verified IDs only).
 * Used when parent PDFs go beyond the Grade 5 built-in lessons
 * (algebra, geometry, physics, chemistry, stats, etc.).
 */

export type ExtraCuratedVideo = {
  youtubeVideoId: string;
  youtubeTitle: string;
  youtubeChannel: string;
  domain: "math" | "ela" | "sci" | "ss" | "read" | "unknown";
  topics: string[];
  sourceUnitTag: string;
  keywords: string[];
  transcript: string;
};

type ExtraDef = {
  youtubeVideoId: string;
  youtubeTitle: string;
  youtubeChannel: string;
  domain: ExtraCuratedVideo["domain"];
  topics: string[];
  sourceUnitTag: string;
  keywords: string;
  blurb: string;
};

function tokenizeLite(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function toCatalog(def: ExtraDef): ExtraCuratedVideo {
  return {
    youtubeVideoId: def.youtubeVideoId,
    youtubeTitle: def.youtubeTitle,
    youtubeChannel: def.youtubeChannel,
    domain: def.domain,
    topics: def.topics,
    sourceUnitTag: def.sourceUnitTag,
    keywords: [...new Set(tokenizeLite(`${def.keywords} ${def.youtubeTitle}`))],
    transcript: `Here is a readable version of this lesson on ${def.youtubeTitle}.\n\n${def.blurb}`,
  };
}

/** Verified Math Antics / Crash Course Kids / TED-Ed expanders. */
const EXTRA_DEFS: ExtraDef[] = [
  // —— Fractions (finer than curriculum units) ——
  {
    youtubeVideoId: "5juto2ze8Lg",
    youtubeTitle: "Math Antics - Adding and Subtracting Fractions",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["frac_like"],
    sourceUnitTag: "EXTRA_MATH_FRAC_LIKE",
    keywords: "adding subtracting fractions same like denominator numerators",
    blurb:
      "When fractions share a denominator, add or subtract numerators and keep the denominator.",
  },
  {
    youtubeVideoId: "4lkq3DgvmJo",
    youtubeTitle: "Math Antics - Dividing Fractions",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["frac_div"],
    sourceUnitTag: "EXTRA_MATH_FRAC_DIV",
    keywords: "dividing fractions reciprocal keep change flip",
    blurb: "Divide fractions by multiplying by the reciprocal (keep, change, flip).",
  },
  {
    youtubeVideoId: "do_IbHId2Os",
    youtubeTitle: "Math Antics - Convert any Fraction to a Decimal",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["frac_to_decimal"],
    sourceUnitTag: "EXTRA_MATH_FRAC_DEC",
    keywords: "convert fraction decimal divide numerator denominator",
    blurb: "Convert a fraction to a decimal by dividing the numerator by the denominator.",
  },
  {
    youtubeVideoId: "CUEOL3_Wm3Y",
    youtubeTitle: "GCF: Greatest Common Factor - Math Antics Extras",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["gcf_lcm"],
    sourceUnitTag: "EXTRA_MATH_GCF",
    keywords: "greatest common factor gcf simplify fractions factors",
    blurb: "Find the greatest common factor to simplify fractions and factor numbers.",
  },

  // —— Percents / ratios / proportions ——
  {
    youtubeVideoId: "JeVSmq1Nrpw",
    youtubeTitle: "Math Antics - What Are Percentages?",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["percent"],
    sourceUnitTag: "EXTRA_MATH_PERCENT",
    keywords: "percentages percent hundredths convert fraction decimal",
    blurb: "A percent is a special fraction with denominator 100.",
  },
  {
    youtubeVideoId: "HxEQxS0QSwg",
    youtubeTitle: "Math Antics - Percents Missing Total",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["percent"],
    sourceUnitTag: "EXTRA_MATH_PERCENT_TOTAL",
    keywords: "percent missing total part whole percent of",
    blurb: "Find a missing total or part when working with percent problems.",
  },
  {
    youtubeVideoId: "RQ2nYUBVvqI",
    youtubeTitle: "Math Antics - Ratios And Rates",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["ratio_rate"],
    sourceUnitTag: "EXTRA_MATH_RATIO",
    keywords: "ratios rates unit rate compare quantities division",
    blurb: "A ratio compares two quantities; a rate often involves time.",
  },
  {
    youtubeVideoId: "USmit5zUGas",
    youtubeTitle: "Math Antics - Proportions",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["proportion"],
    sourceUnitTag: "EXTRA_MATH_PROPORTION",
    keywords: "proportions cross multiply equivalent ratios solve",
    blurb: "Proportions are equivalent ratios; solve them with cross products.",
  },

  // —— Integers / exponents / scientific notation ——
  {
    youtubeVideoId: "OAoLCXpao6s",
    youtubeTitle: "Math Antics - Negative Numbers",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["integers"],
    sourceUnitTag: "EXTRA_MATH_INTEGERS",
    keywords: "negative numbers integers number line below zero",
    blurb: "Negative numbers live to the left of zero on the number line.",
  },
  {
    youtubeVideoId: "2mejAHKMBiM",
    youtubeTitle: "Math Antic - Simplifying Square Roots",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["exponents_roots"],
    sourceUnitTag: "EXTRA_MATH_ROOTS",
    keywords: "square roots radicals simplify perfect squares exponents",
    blurb: "Simplify square roots by factoring out perfect squares.",
  },
  {
    youtubeVideoId: "bXkewQ7WEdI",
    youtubeTitle: "Math Antics - Scientific Notation",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["scientific_notation"],
    sourceUnitTag: "EXTRA_MATH_SCINOT",
    keywords: "scientific notation powers of ten large small numbers",
    blurb: "Scientific notation writes very large or small numbers using powers of 10.",
  },

  // —— Geometry ——
  {
    youtubeVideoId: "DGKwdHMiqCg",
    youtubeTitle: "Math Antics - Angle Basics",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["angles"],
    sourceUnitTag: "EXTRA_MATH_ANGLES",
    keywords: "angle basics degrees acute obtuse right protractor",
    blurb: "Angles are measured in degrees; learn acute, right, and obtuse angles.",
  },
  {
    youtubeVideoId: "IaoZhhx_I9s",
    youtubeTitle: "Math Antics - Polygons",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["polygons"],
    sourceUnitTag: "EXTRA_MATH_POLYGONS",
    keywords: "polygons sides vertices regular irregular shapes",
    blurb: "Polygons are closed shapes made of straight sides.",
  },
  {
    youtubeVideoId: "yiREqzDsMP8",
    youtubeTitle: "Math Antics - Quadrilaterals",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["quadrilaterals"],
    sourceUnitTag: "EXTRA_MATH_QUADS",
    keywords: "quadrilaterals square rectangle parallelogram rhombus trapezoid",
    blurb: "Quadrilaterals are four-sided polygons with special families of shapes.",
  },
  {
    youtubeVideoId: "AAY1bsazcgM",
    youtubeTitle: "Math Antics - Perimeter",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["perimeter"],
    sourceUnitTag: "EXTRA_MATH_PERIMETER",
    keywords: "perimeter distance around shape add sides",
    blurb: "Perimeter is the distance around the outside of a shape.",
  },
  {
    youtubeVideoId: "xCdxURXMdFY",
    youtubeTitle: "Math Antics - Area",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["area"],
    sourceUnitTag: "EXTRA_MATH_AREA",
    keywords: "area square units length width formula cover surface",
    blurb: "Area measures how much surface a shape covers in square units.",
  },
  {
    youtubeVideoId: "ZNX-a-5jGeM",
    youtubeTitle: "Math Antics - Intro to the Metric System",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["measurement"],
    sourceUnitTag: "EXTRA_MATH_METRIC",
    keywords: "metric system meters liters grams kilo milli convert units",
    blurb: "The metric system uses powers of 10 for length, mass, and volume units.",
  },

  // —— Statistics / probability ——
  {
    youtubeVideoId: "B1HEzNTGeZ4",
    youtubeTitle: "Math Antics - Mean, Median and Mode",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["mean_median_mode"],
    sourceUnitTag: "EXTRA_MATH_MMM",
    keywords: "mean median mode average middle most frequent statistics",
    blurb: "Mean, median, and mode are three ways to describe a data set.",
  },
  {
    youtubeVideoId: "KzfWUEJjG18",
    youtubeTitle: "Math Antics - Basic Probability",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["probability"],
    sourceUnitTag: "EXTRA_MATH_PROB",
    keywords: "probability chance outcomes favorable events likelihood",
    blurb: "Probability compares favorable outcomes to total possible outcomes.",
  },
  {
    youtubeVideoId: "hcgThf5mv38",
    youtubeTitle: "Math Antics - Data And Graphs",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["data_graphs"],
    sourceUnitTag: "EXTRA_MATH_GRAPHS",
    keywords: "data graphs bar line pictograph chart table",
    blurb: "Graphs help us organize and read data quickly.",
  },

  // —— Algebra ——
  {
    youtubeVideoId: "NybHckSEQBI",
    youtubeTitle: "Algebra Basics: What Is Algebra? - Math Antics",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["algebra_intro"],
    sourceUnitTag: "EXTRA_MATH_ALGEBRA",
    keywords: "algebra variable expression equation unknown letter x",
    blurb: "Algebra uses variables to stand for unknown numbers.",
  },
  {
    youtubeVideoId: "l3XzepN03KQ",
    youtubeTitle: "Algebra Basics: Solving Basic Equations Part 1 - Math Antics",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["algebra_equations"],
    sourceUnitTag: "EXTRA_MATH_EQ1",
    keywords: "solving equations isolate variable inverse operations one step",
    blurb: "Solve equations by undoing operations to isolate the variable.",
  },
  {
    youtubeVideoId: "LDIiYKYvvdA",
    youtubeTitle: "Algebra Basics: Solving 2-Step Equations - Math Antics",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["algebra_equations"],
    sourceUnitTag: "EXTRA_MATH_EQ2",
    keywords: "two step equations parentheses grouping inverse operations",
    blurb: "Two-step equations need more than one inverse operation.",
  },
  {
    youtubeVideoId: "v-6MShC82ow",
    youtubeTitle: "Algebra Basics: The Distributive Property - Math Antics",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["algebra_distribute"],
    sourceUnitTag: "EXTRA_MATH_DISTRIB",
    keywords: "distributive property a(b+c) expand factor like terms",
    blurb: "The distributive property: a(b + c) = ab + ac.",
  },
  {
    youtubeVideoId: "RyesLifeUBw",
    youtubeTitle: "Algebra Basics: Inequalities In Algebra - Math Antics",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["algebra_inequality"],
    sourceUnitTag: "EXTRA_MATH_INEQ",
    keywords: "inequalities greater less than number line solution set",
    blurb: "Inequalities compare expressions that are not necessarily equal.",
  },
  {
    youtubeVideoId: "9Uc62CuQjc4",
    youtubeTitle: "Algebra Basics: Graphing On The Coordinate Plane - Math Antics",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["coordinate_plane"],
    sourceUnitTag: "EXTRA_MATH_COORD",
    keywords: "coordinate plane graph ordered pairs x axis y axis quadrant",
    blurb: "Plot ordered pairs (x, y) on the coordinate plane.",
  },
  {
    youtubeVideoId: "MXV65i9g1Xg",
    youtubeTitle: "Basic Linear Functions - Math Antics",
    youtubeChannel: "Math Antics",
    domain: "math",
    topics: ["linear_functions"],
    sourceUnitTag: "EXTRA_MATH_LINEAR",
    keywords: "linear functions slope intercept y=mx+b graph line",
    blurb: "Linear functions graph as straight lines; often written y = mx + b.",
  },

  // —— Science: physics ——
  {
    youtubeVideoId: "gWy2-o9uwrc",
    youtubeTitle: "The Great Escape: Crash Course Kids #13.1",
    youtubeChannel: "Crash Course Kids",
    domain: "sci",
    topics: ["phys_gravity"],
    sourceUnitTag: "EXTRA_SCI_GRAVITY",
    keywords: "gravity escape velocity force pull earth mass physics",
    blurb: "Gravity pulls objects toward Earth's center; escape velocity fights that pull.",
  },
  {
    youtubeVideoId: "vwfbdPyzgDo",
    youtubeTitle: "Over (to) The Moon: Crash Course Kids #13.2",
    youtubeChannel: "Crash Course Kids",
    domain: "sci",
    topics: ["phys_gravity"],
    sourceUnitTag: "EXTRA_SCI_GRAVITY2",
    keywords: "gravity moon mass distance newton physics orbit",
    blurb: "Gravitational pull depends on mass and distance between objects.",
  },
  {
    youtubeVideoId: "dxcx35x5L9Y",
    youtubeTitle: "Danger! Falling Objects: Crash Course Kids #32.1",
    youtubeChannel: "Crash Course Kids",
    domain: "sci",
    topics: ["phys_forces"],
    sourceUnitTag: "EXTRA_SCI_FORCES",
    keywords: "falling objects air resistance force friction physics motion",
    blurb: "Air resistance, not mass alone, changes how objects appear to fall on Earth.",
  },
  {
    youtubeVideoId: "lSdaf8_Mr8E",
    youtubeTitle: "Let's Fly!: Crash Course Kids 26.2",
    youtubeChannel: "Crash Course Kids",
    domain: "sci",
    topics: ["phys_motion"],
    sourceUnitTag: "EXTRA_SCI_MOTION",
    keywords: "flight motion forces lift drag thrust weight physics",
    blurb: "Flight balances lift, weight, thrust, and drag — forces in motion.",
  },
  {
    youtubeVideoId: "s236Q1nuWXg",
    youtubeTitle: "Fun with Magnets!",
    youtubeChannel: "SciShow Kids",
    domain: "sci",
    topics: ["phys_magnetism"],
    sourceUnitTag: "EXTRA_SCI_MAGNETS",
    keywords: "magnets magnetism magnetic field poles attract repel iron compass",
    blurb:
      "Magnets have north and south poles. Opposite poles attract; like poles repel.",
  },
  {
    youtubeVideoId: "5hH5radPWHo",
    youtubeTitle: "The Amazing Power of Magnets | SciShow Kids Compilation",
    youtubeChannel: "SciShow Kids",
    domain: "sci",
    topics: ["phys_magnetism"],
    sourceUnitTag: "EXTRA_SCI_MAGNETS2",
    keywords: "magnets magnetic force poles navigation magnetite",
    blurb: "Explore how magnets pull, push, and help with navigation.",
  },
  {
    youtubeVideoId: "5TAIUCYMlIQ",
    youtubeTitle: "The Sticky Balloon Trick! | Physics for Kids",
    youtubeChannel: "SciShow Kids",
    domain: "sci",
    topics: ["phys_electricity"],
    sourceUnitTag: "EXTRA_SCI_STATIC",
    keywords: "static electricity charge positive negative balloon circuit physics",
    blurb:
      "Static electricity is an imbalance of positive and negative charges.",
  },

  // —— Science: chemistry / atoms ——
  {
    youtubeVideoId: "yQP4UJhNn0I",
    youtubeTitle: "Just How Small is an Atom?",
    youtubeChannel: "TED-Ed",
    domain: "sci",
    topics: ["chem_atoms"],
    sourceUnitTag: "EXTRA_SCI_ATOMS",
    keywords: "atom molecule proton neutron electron chemistry elements",
    blurb: "Atoms are the tiny building blocks of matter.",
  },
  {
    youtubeVideoId: "QnQe0xW_JY4",
    youtubeTitle: "Carbon... SO SIMPLE: Crash Course Biology #1",
    youtubeChannel: "Crash Course",
    domain: "sci",
    topics: ["chem_molecules"],
    sourceUnitTag: "EXTRA_SCI_CARBON",
    keywords: "carbon molecules chemistry biology organic compounds",
    blurb: "Carbon forms the backbone of many molecules important to life.",
  },

  // —— Science: biology ——
  {
    youtubeVideoId: "eo5XndJaz-Y",
    youtubeTitle: "The simple story of photosynthesis and food - Amanda Ooten",
    youtubeChannel: "TED-Ed",
    domain: "sci",
    topics: ["bio_photosynthesis"],
    sourceUnitTag: "EXTRA_SCI_PHOTO",
    keywords: "photosynthesis plants glucose sunlight chlorophyll biology",
    blurb: "Photosynthesis turns sunlight, water, and carbon dioxide into food energy.",
  },

  // —— Science: weather / climate ——
  {
    youtubeVideoId: "YbAWny7FV3w",
    youtubeTitle: "Weather vs. Climate: Crash Course Kids #28.1",
    youtubeChannel: "Crash Course Kids",
    domain: "sci",
    topics: ["sci_weather"],
    sourceUnitTag: "EXTRA_SCI_WEATHER",
    keywords: "weather climate atmosphere temperature forecast meteorology",
    blurb: "Weather is short-term; climate is the long-term pattern.",
  },
  {
    youtubeVideoId: "RD-2dvaG4UY",
    youtubeTitle: "Weather Channels: Crash Course Kids #34.2",
    youtubeChannel: "Crash Course Kids",
    domain: "sci",
    topics: ["sci_weather"],
    sourceUnitTag: "EXTRA_SCI_WEATHER2",
    keywords: "weather jet stream fronts ocean currents atmosphere",
    blurb: "Jet streams, fronts, and ocean currents move weather around Earth.",
  },
  {
    youtubeVideoId: "P-G0YkfgdbA",
    youtubeTitle: "Up, Up & Away: Crash Course Kids #16.2",
    youtubeChannel: "Crash Course Kids",
    domain: "sci",
    topics: ["sci_weather"],
    sourceUnitTag: "EXTRA_SCI_WIND",
    keywords: "wind air pressure atmosphere hydrosphere geosphere",
    blurb: "Wind forms when air moves from high pressure to low pressure.",
  },
];

export function getExtraCuratedVideos(): ExtraCuratedVideo[] {
  return EXTRA_DEFS.map(toCatalog);
}
