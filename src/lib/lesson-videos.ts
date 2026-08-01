import { LESSONS, type Lesson } from "@/lib/curriculum";
import { getExtraCuratedVideos } from "@/lib/lesson-video-library";

/** Fine-grained topic tags — one skill → one best video. */
export type VideoTopic =
  // Grade 5 math core
  | "frac_like"
  | "frac_unlike"
  | "frac_mult"
  | "frac_div"
  | "frac_to_decimal"
  | "gcf_lcm"
  | "whole_mult"
  | "long_div"
  | "decimal_place"
  | "decimal_ops"
  | "powers10"
  | "volume"
  // Expanded math
  | "percent"
  | "ratio_rate"
  | "proportion"
  | "integers"
  | "exponents_roots"
  | "scientific_notation"
  | "angles"
  | "polygons"
  | "quadrilaterals"
  | "perimeter"
  | "area"
  | "measurement"
  | "mean_median_mode"
  | "probability"
  | "data_graphs"
  | "algebra_intro"
  | "algebra_equations"
  | "algebra_distribute"
  | "algebra_inequality"
  | "coordinate_plane"
  | "linear_functions"
  // ELA / SS / reading
  | "ela_hero"
  | "ela_roots"
  | "ela_racece"
  | "ela_main_idea"
  | "ss_maps"
  | "ss_history"
  | "ss_exploration"
  | "ss_us"
  | "ss_mexico"
  | "ss_canada"
  | "read_log"
  // Science core + expanded
  | "sci_matter"
  | "sci_mass"
  | "sci_spheres"
  | "sci_ecosystems"
  | "sci_stars"
  | "sci_water"
  | "sci_weather"
  | "phys_gravity"
  | "phys_forces"
  | "phys_motion"
  | "phys_magnetism"
  | "phys_electricity"
  | "chem_atoms"
  | "chem_molecules"
  | "bio_photosynthesis";

export type CatalogVideo = {
  youtubeVideoId: string;
  youtubeTitle: string;
  youtubeChannel: string;
  /** Searchable topic tokens (domain-stripped of boilerplate). */
  keywords: string[];
  /** Primary topic tags for precise routing. */
  topics: VideoTopic[];
  /** Readable transcript paired with the video. */
  transcript: string;
  sourceUnitTag: string;
  domain: LessonDomain;
};

export type LessonDomain = "math" | "ela" | "sci" | "ss" | "read" | "unknown";

const UNIT_TOPICS: Record<string, VideoTopic[]> = {
  "187_MATH_WHOLE_NUM": ["whole_mult"],
  "187_MATH_DECIMALS": ["decimal_place"],
  "187_MATH_FRACTIONS": ["frac_unlike"],
  "187_MATH_VOLUME": ["volume"],
  "187_MATH_POWERS10": ["powers10"],
  "187_MATH_DECIMAL_OPS": ["decimal_ops"],
  "187_MATH_FRAC_MULT": ["frac_mult"],
  "187_MATH_DIV_2DIGIT": ["long_div"],
  "187_ELA_UNIT1": ["ela_hero"],
  "187_ELA_ROOTS": ["ela_roots"],
  "187_RACECE_FORMAT": ["ela_racece"],
  "187_ELA_MAIN_IDEA": ["ela_main_idea"],
  "187_SCI_MATTER": ["sci_matter"],
  "187_SCI_MASS": ["sci_mass"],
  "187_SCI_SPHERES": ["sci_spheres"],
  "187_SCI_ECOSYSTEMS": ["sci_ecosystems"],
  "187_SCI_STARS": ["sci_stars"],
  "187_SCI_WATER": ["sci_water"],
  "187_SS_MAPS": ["ss_maps"],
  "187_SS_HISTORY": ["ss_history"],
  "187_SS_EXPLORATION": ["ss_exploration"],
  "187_SS_US": ["ss_us"],
  "187_SS_MEXICO": ["ss_mexico"],
  "187_SS_CANADA": ["ss_canada"],
  "187_READ_LOG": ["read_log"],
};

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "are",
  "was",
  "were",
  "you",
  "your",
  "into",
  "about",
  "then",
  "than",
  "have",
  "has",
  "had",
  "not",
  "but",
  "can",
  "how",
  "what",
  "when",
  "where",
  "why",
  "who",
  "which",
  "their",
  "them",
  "they",
  "our",
  "out",
  "any",
  "all",
  "each",
  "more",
  "most",
  "some",
  "such",
  "only",
  "other",
  "also",
  "just",
  "like",
  "use",
  "using",
  "unit",
  "grade",
  "lesson",
  "coach",
  "tip",
  "here",
  "readable",
  "version",
  // Worksheet boilerplate — these wrongly pull Math Antics matches
  "name",
  "date",
  "write",
  "answer",
  "answers",
  "explain",
  "show",
  "work",
  "question",
  "questions",
  "number",
  "numbers",
  "compare",
  "complete",
  "circle",
  "blank",
  "fill",
  "true",
  "false",
  "choice",
  "choices",
  "page",
  "worksheet",
  "reading",
  "comprehension",
  "student",
  "teacher",
  "directions",
  "follow",
  "read",
  "text",
  "pass",
  "percent",
  "custom",
  "antics",
  "crash",
  "course",
  "kids",
  "ted",
  "nat",
  "geo",
]);

const DOMAIN_HINTS: Record<Exclude<LessonDomain, "unknown">, string[]> = {
  math: [
    "math",
    "algebra",
    "geometry",
    "fraction",
    "fractions",
    "decimal",
    "decimals",
    "multiply",
    "multiplication",
    "division",
    "divisor",
    "numerator",
    "denominator",
    "place",
    "value",
    "volume",
    "powers",
    "whole",
    "digit",
    "arithmetic",
    "equation",
    "variable",
    "percent",
    "ratio",
    "proportion",
    "integer",
    "exponent",
    "perimeter",
    "area",
    "angle",
    "polygon",
    "probability",
    "add",
    "subtract",
  ],
  ela: [
    "ela",
    "english",
    "literacy",
    "character",
    "narrative",
    "main",
    "idea",
    "evidence",
    "root",
    "roots",
    "racece",
    "rhetoric",
    "writing",
    "literature",
    "vocabulary",
    "fiction",
  ],
  sci: [
    "science",
    "sci",
    "physics",
    "chemistry",
    "magnet",
    "magnets",
    "magnetism",
    "electricity",
    "biology",
    "matter",
    "mass",
    "density",
    "ecosystem",
    "food",
    "web",
    "sphere",
    "spheres",
    "earth",
    "moon",
    "sun",
    "star",
    "stars",
    "planet",
    "orbit",
    "rotate",
    "rotation",
    "water",
    "freshwater",
    "conservation",
    "properties",
    "solid",
    "liquid",
    "gas",
    "solar",
    "space",
    "astronomy",
    "nyssls",
    "gravity",
    "force",
    "motion",
    "atom",
    "molecule",
    "photosynthesis",
    "weather",
    "climate",
    "electricity",
    "energy",
  ],
  ss: [
    "social",
    "studies",
    "history",
    "geography",
    "map",
    "maps",
    "government",
    "exploration",
    "explorer",
    "inca",
    "aztec",
    "mexico",
    "canada",
    "america",
    "civics",
    "culture",
    "continent",
  ],
  read: ["assigned", "ebook", "novel", "chapter", "booklog"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

const FRAC_SIGNAL =
  /\bfractions?\b|\bnumerator|\bdenominator|\bimproper\b|\bmixed\s+number|\b\d+\s*\/\s*\d+/i;

type TopicRule = {
  topic: VideoTopic;
  /** Higher = more specific; used to pick a winner when several rules fire. */
  weight: number;
  test: (text: string) => boolean;
};

/**
 * Skill detectors. Specific phrases outrank shared domain words so worksheets
 * (algebra vs arithmetic, physics vs matter, etc.) don't collapse onto one video.
 */
const TOPIC_RULES: TopicRule[] = [
  // —— Algebra (before generic "equation"/"multiply") ——
  {
    topic: "algebra_distribute",
    weight: 130,
    test: (t) =>
      /\bdistribut(ive|e|ion)\b|\ba\s*\(\s*b\s*\+\s*c\s*\)|\blike\s+terms\b|\bexpand(ing)?\s+(the\s+)?expression/.test(
        t,
      ),
  },
  {
    topic: "algebra_inequality",
    weight: 128,
    test: (t) =>
      /\binequalit|\bgreater\s+than\s+or\s+equal|\bless\s+than\s+or\s+equal|\b[<>]=?\b.+\bx\b|\bnumber\s+line\b.+\b(inequal|solution)/.test(
        t,
      ),
  },
  {
    topic: "linear_functions",
    weight: 128,
    test: (t) =>
      /\blinear\s+function|\bslope[\s-]?intercept|\by\s*=\s*mx\s*\+\s*b|\bslope\b.+\bintercept|\bgraph(ing)?\s+(a\s+)?line/.test(
        t,
      ),
  },
  {
    topic: "coordinate_plane",
    weight: 125,
    test: (t) =>
      /\bcoordinate\s+plane|\bordered\s+pairs?|\bx[\s-]?axis|\by[\s-]?axis|\bquadrants?\b|\bplot(ting)?\s+points?/.test(
        t,
      ),
  },
  {
    topic: "algebra_equations",
    weight: 125,
    test: (t) =>
      /\bsolv(e|ing)\s+(basic\s+|one[\s-]?step\s+|two[\s-]?step\s+)?equations?|\bisolate\s+(the\s+)?variable|\binverse\s+operations?|\bfind\s+x\b|\bx\s*=/.test(
        t,
      ) ||
      (/\balgebra\b/.test(t) && /\bequation/.test(t)),
  },
  {
    topic: "algebra_intro",
    weight: 118,
    test: (t) =>
      /\balgebra\b|\bvariables?\b|\balgebraic\s+expression|\bunknown\s+number|\blet\s+[a-z]\s+be\b/.test(
        t,
      ),
  },

  // —— Fractions ——
  {
    topic: "frac_to_decimal",
    weight: 122,
    test: (t) =>
      FRAC_SIGNAL.test(t) &&
      /\bconvert\b.+\bdecimal|\bfraction\s+to\s+a?\s*decimal|\bas\s+a\s+decimal/.test(
        t,
      ),
  },
  {
    topic: "frac_div",
    weight: 120,
    test: (t) =>
      FRAC_SIGNAL.test(t) &&
      /\bdivid(e|es|ing|ed|sion)\b|\b÷\b|\breciprocal\b|\bkeep\s*[, ]\s*change\s*[, ]\s*flip\b/.test(
        t,
      ),
  },
  {
    topic: "frac_mult",
    weight: 115,
    test: (t) =>
      FRAC_SIGNAL.test(t) &&
      /\bmultipl(y|ies|ying|ication)\b|\b×\b|\btimes\b|\bof\s+(a\s+)?(whole|number|\d)|\bproduct\b/.test(
        t,
      ),
  },
  {
    topic: "gcf_lcm",
    weight: 112,
    test: (t) =>
      /\bgreatest\s+common\s+factor|\bgcf\b/.test(t) ||
      (/\bleast\s+common\s+multiple|\blcm\b/.test(t) &&
        !/\b(add|subtract|denominator|fraction)/.test(t)),
  },
  {
    topic: "frac_unlike",
    weight: 110,
    test: (t) =>
      FRAC_SIGNAL.test(t) &&
      /\bunlike\b|\bdifferent\s+denominator|\bcommon\s+denominator|\bleast\s+common|\blcd\b|\bequivalent\s+fraction/.test(
        t,
      ),
  },
  {
    topic: "frac_like",
    weight: 105,
    test: (t) =>
      FRAC_SIGNAL.test(t) &&
      /\bsame\s+denominator|\blike\s+fraction|\bkeep\s+the\s+denominator/.test(t),
  },
  {
    topic: "frac_unlike",
    weight: 95,
    test: (t) =>
      FRAC_SIGNAL.test(t) &&
      /\badd(ing|ition)?\b|\bsubtract(ing|ion)?\b|\bplus\b|\bminus\b/.test(t),
  },

  // —— Percents / ratios ——
  {
    topic: "proportion",
    weight: 120,
    test: (t) =>
      /\bproportions?\b|\bcross\s+multipl|\bequivalent\s+ratios?/.test(t),
  },
  {
    topic: "ratio_rate",
    weight: 115,
    test: (t) =>
      /\bratios?\b|\brates?\b|\bunit\s+rate\b|\bper\s+(hour|minute|second|day)\b/.test(
        t,
      ) && !/\bpercent/.test(t),
  },
  {
    topic: "percent",
    weight: 115,
    test: (t) =>
      /\bpercents?\b|\bpercentages?\b|\b%\b|\bpercent\s+of\b|\bout\s+of\s+100\b/.test(
        t,
      ),
  },

  // —— Geometry ——
  {
    topic: "area",
    weight: 118,
    test: (t) =>
      /\barea\b|\bsquare\s+units?\b|\blength\s*[×x*]\s*width\b/.test(t) &&
      !/\bvolume\b|\bsurface\s+area/.test(t),
  },
  {
    topic: "perimeter",
    weight: 116,
    test: (t) =>
      /\bperimeter\b|\bdistance\s+around\b|\badd\s+(all\s+)?(the\s+)?sides\b/.test(
        t,
      ),
  },
  {
    topic: "quadrilaterals",
    weight: 114,
    test: (t) =>
      /\bquadrilaterals?\b|\bparallelogram|\brhombus|\btrapezoid|\brectangle|\bsquare\b.+\bsides/.test(
        t,
      ),
  },
  {
    topic: "polygons",
    weight: 112,
    test: (t) =>
      /\bpolygons?\b|\bhexagon|\boctagon|\bpentagon|\bregular\s+polygon/.test(t),
  },
  {
    topic: "angles",
    weight: 112,
    test: (t) =>
      /\bangles?\b|\bdegrees?\b|\bacute\b|\bobtuse\b|\bprotractor|\bright\s+angle/.test(
        t,
      ),
  },
  {
    topic: "measurement",
    weight: 108,
    test: (t) =>
      /\bmetric\s+system|\bkilometers?\b|\bmillimeters?\b|\bconvert\s+units|\bkilograms?\b|\bliters?\b/.test(
        t,
      ),
  },

  // —— Stats ——
  {
    topic: "probability",
    weight: 118,
    test: (t) =>
      /\bprobability\b|\blikelihood\b|\bfavorable\s+outcomes?|\bchance\b.+\b(event|outcome)/.test(
        t,
      ),
  },
  {
    topic: "mean_median_mode",
    weight: 116,
    test: (t) =>
      /\bmean\b|\bmedian\b|\bmode\b|\baverage\b.+\bdata|\bmeasures?\s+of\s+center/.test(
        t,
      ),
  },
  {
    topic: "data_graphs",
    weight: 110,
    test: (t) =>
      /\bbar\s+graph|\bline\s+graph|\bpictograph|\bdata\s+and\s+graphs|\bchart\b.+\bdata|\bfrequency\s+table/.test(
        t,
      ),
  },

  // —— Other math ——
  {
    topic: "scientific_notation",
    weight: 120,
    test: (t) => /\bscientific\s+notation\b|\b\d+(\.\d+)?\s*[x×]\s*10\s*\^/.test(t),
  },
  {
    topic: "exponents_roots",
    weight: 115,
    test: (t) =>
      /\bsquare\s+roots?|\bradicals?\b|\bexponents?\b|\bperfect\s+square/.test(t) &&
      !/\bpowers?\s+of\s+10\b|\bscientific\s+notation/.test(t),
  },
  {
    topic: "integers",
    weight: 112,
    test: (t) =>
      /\bnegative\s+numbers?|\bintegers?\b|\babsolute\s+value|\bbelow\s+zero/.test(
        t,
      ),
  },
  {
    topic: "volume",
    weight: 100,
    test: (t) =>
      /\bvolume\b|\brectangular\s+prism|\bcubic\s+(unit|cm|in|m)\b|\blength\s*[×x*]\s*width\s*[×x*]\s*height|\bv\s*=\s*l/.test(
        t,
      ),
  },
  {
    topic: "powers10",
    weight: 100,
    test: (t) =>
      /\bpowers?\s+of\s+10\b|\b10\s*(\^|to the)\s*\d|\bshift(s|ing)?\s+(the\s+)?decimal|\bmultiplying\s+by\s+10\b/.test(
        t,
      ),
  },
  {
    topic: "decimal_ops",
    weight: 100,
    test: (t) =>
      /\bdecimal/.test(t) &&
      /\b(add|adding|addition|subtract|multiplying|multiply|multiplication|divid|operation|arithmetic)\b/.test(
        t,
      ) &&
      !/\bplace\s+value\b/.test(t) &&
      !FRAC_SIGNAL.test(t),
  },
  {
    topic: "decimal_place",
    weight: 105,
    test: (t) =>
      (/\bdecimal\s+place\b|\bplace\s+value\b/.test(t) ||
        ((/\bdecimal|\bthousandths\b|\bhundredths\b|\btenths\b/.test(t) &&
          /\bround(ing)?\b|\bcompare\b|\bplaceholder|\bdigit\s+is\s+in\s+the/.test(
            t,
          )) &&
          !/\b(add|adding|addition|subtract|multiplying|multiply|divid|operation|arithmetic)\b/.test(
            t,
          ))) &&
      !/\bpowers?\s+of\s+10\b/.test(t) &&
      !FRAC_SIGNAL.test(t),
  },
  {
    topic: "long_div",
    weight: 100,
    test: (t) =>
      !FRAC_SIGNAL.test(t) &&
      !/\balgebra\b/.test(t) &&
      /\blong\s+division\b|\b2[\s-]?digit\s+divisor|\bdivisors?\b|\bdividends?\b|\bquotients?\b|\bremainders?\b/.test(
        t,
      ),
  },
  {
    topic: "whole_mult",
    weight: 100,
    test: (t) =>
      !FRAC_SIGNAL.test(t) &&
      !/\bdecimal|\balgebra\b/.test(t) &&
      /\bmulti[\s-]?digit\b|\bpartial\s+products?\b|\b3[\s-]?digit\b.+\b2[\s-]?digit|\b2[\s-]?digit\b.+\bmultipl|\bmultipl(y|ication)\b.+\b(whole|digit)/.test(
        t,
      ),
  },

  // —— Physics ——
  {
    topic: "phys_magnetism",
    weight: 130,
    test: (t) =>
      /\bmagnet(s|ism|ic)?\b|\bmagnetic\s+field|\bnorth\s+pole\b.+\bsouth\s+pole|\battract\b.+\brepel|\bcompass\b.+\bmagnet/.test(
        t,
      ),
  },
  {
    topic: "phys_electricity",
    weight: 128,
    test: (t) =>
      /\belectricity\b|\bstatic\s+(electric|charge)|\bcircuit\b|\bcurrent\b|\bvoltage\b|\bconductor\b|\binsulator\b/.test(
        t,
      ),
  },
  {
    topic: "phys_gravity",
    weight: 125,
    test: (t) =>
      /\bgravity\b|\bgravitational\b|\bescape\s+velocity|\bpull\s+(of\s+)?earth|\bweightlessness/.test(
        t,
      ),
  },
  {
    topic: "phys_forces",
    weight: 122,
    test: (t) =>
      /\bforces?\b|\bair\s+resistance|\bfriction\b|\bnet\s+force|\bnewton'?s\s+laws?|\bpush(es|ing)?\s+and\s+pull/.test(
        t,
      ) && !/\bmagnet|electric/.test(t),
  },
  {
    topic: "phys_motion",
    weight: 118,
    test: (t) =>
      /\bmotion\b|\bvelocity\b|\bspeed\b|\bacceleration\b|\blift\b|\bdrag\b|\bthrust\b|\bphysics\b/.test(
        t,
      ) && !/\bmagnet|electric|gravity/.test(t),
  },

  // —— Chemistry / biology ——
  {
    topic: "chem_atoms",
    weight: 125,
    test: (t) =>
      /\batoms?\b|\bprotons?\b|\bneutrons?\b|\belectrons?\b|\belements?\b|\bperiodic\s+table/.test(
        t,
      ),
  },
  {
    topic: "chem_molecules",
    weight: 120,
    test: (t) =>
      /\bmolecules?\b|\bchemical\s+(bond|reaction|formula)|\bcompound\b|\bcarbon\b.+\b(molecule|organic)/.test(
        t,
      ),
  },
  {
    topic: "bio_photosynthesis",
    weight: 125,
    test: (t) =>
      /\bphotosynthesis\b|\bchlorophyll\b|\bglucose\b.+\bplant|\bplants?\s+make\s+food/.test(
        t,
      ),
  },
  {
    topic: "sci_weather",
    weight: 120,
    test: (t) =>
      /\bweather\b|\bclimate\b|\bjet\s+stream|\bmeteorology|\bforecast\b|\bfronts?\b.+\b(cold|warm)|\bwind\b.+\bpressure/.test(
        t,
      ),
  },

  // —— Science core ——
  {
    topic: "sci_ecosystems",
    weight: 110,
    test: (t) =>
      /\becosystem|\bfood\s+webs?\b|\bproducers?\b|\bconsumers?\b|\bdecomposers?\b|\benergy\s+flow|\bmatter\s+(&|and)\s+energy/.test(
        t,
      ),
  },
  {
    topic: "sci_mass",
    weight: 110,
    test: (t) =>
      /\bconserv(ation|ed)?\s+of\s+mass\b|\bclosed\s+system\b.+\bmass|\bmass\b.+\bconserv/.test(
        t,
      ),
  },
  {
    topic: "sci_spheres",
    weight: 110,
    test: (t) =>
      /\b(four\s+)?spheres?\b|\bgeosphere|\bhydrosphere|\batmosphere|\bbiosphere/.test(
        t,
      ),
  },
  {
    topic: "sci_water",
    weight: 105,
    test: (t) =>
      /\bfresh\s*water|\bwater\s+on\s+earth|\bwater\s+cycle|\bgroundwater|\bsalt\s*water|\bocean\s+water|\bpercent(age)?\s+of\s+water/.test(
        t,
      ),
  },
  {
    topic: "sci_stars",
    weight: 105,
    test: (t) =>
      /\bstars?\b|\bbrightness\b|\bsolar\s+system|\bmoon\b|\borbit|\bplanet|\bearth\s+spins|\bday\s+and\s+night|\bastronomy|\bsun\b/.test(
        t,
      ) && !/\bsphere|\bgravity\b/.test(t),
  },
  {
    topic: "sci_matter",
    weight: 100,
    test: (t) =>
      (/\bproperties?\s+of\s+matter\b|\bstates?\s+of\s+matter\b|\bsolid\b.+\bliquid|\bliquid\b.+\bgas|\bmatter\b.+\b(solid|liquid|gas|propert)/.test(
        t,
      ) ||
        (/\bmatter\b/.test(t) &&
          /\b(solid|liquid|gas|propert|density|mass\s+and\s+volume)/.test(t))) &&
      !/\becosystem|\bfood\s+web|\bconserv(ation|ed)?\s+of\s+mass|\batom|\bmolecule/.test(
        t,
      ),
  },

  // —— ELA ——
  {
    topic: "ela_racece",
    weight: 110,
    test: (t) =>
      /\bracece\b|\brace\s+strategy|\brestate\b.+\banswer|\bcite\b.+\bexplain|\bwriting\s+framework|\bconstructed\s+response/.test(
        t,
      ),
  },
  {
    topic: "ela_roots",
    weight: 110,
    test: (t) =>
      /\bgreek\b|\blatin\b|\broots?\b|\baffix|\bprefix|\bsuffix|\betymolog|\bword\s+origin|\bnew\s+words\s+come\s+from/.test(
        t,
      ),
  },
  {
    topic: "ela_main_idea",
    weight: 105,
    test: (t) =>
      /\bmain\s+idea\b|\bcentral\s+idea\b|\btext\s+evidence\b|\bsupporting\s+details?\b|\bdeeper\s+meaning|\binferenc/.test(
        t,
      ),
  },
  {
    topic: "ela_hero",
    weight: 100,
    test: (t) =>
      /\bcharacter\b|\bnarrative\b|\bprotagonist|\bhero\b|\btrait|\bcharacter\s+change|\bstory\s+arc/.test(
        t,
      ),
  },

  // —— Social studies ——
  {
    topic: "ss_exploration",
    weight: 110,
    test: (t) =>
      /\bexplor(e|ation|er|ers)\b|\bmagellan|\bcolumbus|\bcircumnavigat|\beuropean\s+exploration/.test(
        t,
      ),
  },
  {
    topic: "ss_history",
    weight: 110,
    test: (t) =>
      /\binca\b|\bmaya\b|\baztec\b|\bearly\s+societ|\bmesoamerica|\bempires?\b/.test(
        t,
      ) && !/\bmexico\b/.test(t),
  },
  {
    topic: "ss_us",
    weight: 110,
    test: (t) =>
      /\bunited\s+states\b|\bbranches?\s+of\s+government|\bconstitution\b|\bcongress\b|\bcivics\b/.test(
        t,
      ),
  },
  {
    topic: "ss_mexico",
    weight: 110,
    test: (t) => /\bmexico\b|\bmexican\b|\btenochtitl/.test(t),
  },
  {
    topic: "ss_canada",
    weight: 110,
    test: (t) => /\bcanada\b|\bcanadian\b|\bottawa\b|\bprovinces?\b/.test(t),
  },
  {
    topic: "ss_maps",
    weight: 100,
    test: (t) =>
      /\bgeography\b|\bwestern\s+hemisphere\b|\bcontinent|\blatitude|\blongitude|\bmap\s+skill|\bsouth\s+america|\bnorth\s+america/.test(
        t,
      ),
  },

  // —— Reading ——
  {
    topic: "read_log",
    weight: 100,
    test: (t) =>
      /\breading\s+(log|habit|goal)|strong\s+reading|\bfiction\s+can\s+change|\bbook\s+log|\bindependent\s+reading|\bdaily\s+reading/.test(
        t,
      ),
  },
];

function scoreTopicRules(blob: string): Array<{ topic: VideoTopic; score: number }> {
  const text = blob.toLowerCase();
  const byTopic = new Map<VideoTopic, number>();
  for (const rule of TOPIC_RULES) {
    if (!rule.test(text)) continue;
    const prev = byTopic.get(rule.topic) ?? 0;
    if (rule.weight > prev) byTopic.set(rule.topic, rule.weight);
  }
  return [...byTopic.entries()]
    .map(([topic, score]) => ({ topic, score }))
    .sort((a, b) => b.score - a.score);
}

function topicFamily(topic: VideoTopic): string {
  if (topic.startsWith("frac_")) return "frac";
  if (topic.startsWith("decimal_")) return "decimal";
  if (topic.startsWith("algebra_") || topic === "linear_functions" || topic === "coordinate_plane")
    return "algebra";
  if (
    topic === "angles" ||
    topic === "polygons" ||
    topic === "quadrilaterals" ||
    topic === "perimeter" ||
    topic === "area" ||
    topic === "volume" ||
    topic === "measurement"
  )
    return "geometry";
  if (topic.startsWith("phys_")) return "physics";
  if (topic.startsWith("chem_") || topic.startsWith("bio_")) return "chem_bio";
  if (topic.startsWith("sci_")) return "sci";
  if (topic.startsWith("ela_")) return "ela";
  if (topic.startsWith("ss_")) return "ss";
  if (topic.startsWith("read_")) return "read";
  if (topic === "percent" || topic === "ratio_rate" || topic === "proportion")
    return "ratio_percent";
  if (
    topic === "mean_median_mode" ||
    topic === "probability" ||
    topic === "data_graphs"
  )
    return "stats";
  return topic;
}

/**
 * Detect the specific skill the worksheet teaches.
 * Returns at most the top skill so shared words don't attach the wrong video.
 */
export function detectVideoTopics(blob: string): VideoTopic[] {
  const text = blob.toLowerCase();
  let ranked = scoreTopicRules(blob);
  if (!ranked.length) return [];

  // If both fraction multiply and divide fire, prefer the operation mentioned more.
  const hasMult = ranked.some((r) => r.topic === "frac_mult");
  const hasDiv = ranked.some((r) => r.topic === "frac_div");
  if (hasMult && hasDiv) {
    const divN = (text.match(/\bdivid/g) ?? []).length;
    const multN = (text.match(/\bmultipl/g) ?? []).length;
    const prefer: VideoTopic = divN > multN ? "frac_div" : "frac_mult";
    ranked = ranked.filter((r) => r.topic === prefer || topicFamily(r.topic) !== "frac");
  }

  const top = ranked[0].score;
  return ranked.filter((r) => r.score >= top - 5).slice(0, 1).map((r) => r.topic);
}

/** Prefer title/teach topics; fall back to PDF body when the draft title is vague. */
export function detectVideoTopicsFromParts(
  focusBlob: string,
  pdfBlob: string,
): VideoTopic[] {
  const fromFocus = detectVideoTopics(focusBlob);
  if (fromFocus.length) return fromFocus;
  return detectVideoTopics(pdfBlob);
}

export function domainFromUnitTag(unitTag: string | undefined | null): LessonDomain {
  const tag = (unitTag ?? "").toUpperCase();
  if (tag.includes("_MATH_") || tag.startsWith("187_MATH")) return "math";
  if (tag.includes("_ELA_") || tag.includes("RACECE") || tag.startsWith("187_ELA")) return "ela";
  if (tag.includes("_SCI_") || tag.startsWith("187_SCI")) return "sci";
  if (tag.includes("_SS_") || tag.startsWith("187_SS")) return "ss";
  if (tag.includes("READ") || tag.includes("BOOK")) return "read";
  if (tag.includes("MATH")) return "math";
  if (tag.includes("SCI") || tag.includes("SCIENCE")) return "sci";
  if (tag.includes("ELA") || tag.includes("LITERACY")) return "ela";
  if (tag.includes("SOCIAL") || tag.includes("_SS")) return "ss";
  return "unknown";
}

/** Infer domain from subject picker + title/teach — prefer content over AI-invented unit tags. */
export function detectLessonDomain(input: {
  title?: string;
  teach?: string[];
  tip?: string;
  unitTag?: string;
  subjectHint?: string;
  pdfExcerpt?: string;
}): LessonDomain {
  const subject = (input.subjectHint ?? "").toLowerCase();
  let subjectDomain: LessonDomain = "unknown";
  if (/\bmath|mathematics|arithmetic|algebra|geometry\b/.test(subject))
    subjectDomain = "math";
  else if (/\bela|english|literacy|language\b/.test(subject)) subjectDomain = "ela";
  else if (
    /\bsci|science|stem|earth|space|biology|physics|chemistry\b/.test(subject)
  )
    subjectDomain = "sci";
  else if (/\bsocial|history|geography|civics\b/.test(subject)) subjectDomain = "ss";
  else if (/\bread|book\b/.test(subject)) subjectDomain = "read";

  const blob = [
    input.title,
    ...(input.teach ?? []),
    input.tip,
    (input.pdfExcerpt ?? "").slice(0, 1200),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores: Record<Exclude<LessonDomain, "unknown">, number> = {
    math: 0,
    ela: 0,
    sci: 0,
    ss: 0,
    read: 0,
  };

  for (const [domain, hints] of Object.entries(DOMAIN_HINTS) as Array<
    [Exclude<LessonDomain, "unknown">, string[]]
  >) {
    for (const hint of hints) {
      if (blob.includes(hint)) scores[domain] += hint.length > 5 ? 2 : 1;
    }
  }

  // AI unit tags are untrusted for parent PDFs — only a soft signal.
  const fromTag = domainFromUnitTag(input.unitTag);
  if (fromTag !== "unknown") scores[fromTag] += 1;

  let contentBest: LessonDomain = "unknown";
  let contentScore = 0;
  for (const [domain, score] of Object.entries(scores) as Array<
    [Exclude<LessonDomain, "unknown">, number]
  >) {
    if (score > contentScore) {
      contentBest = domain;
      contentScore = score;
    }
  }

  // Subject picker wins when content is weak; content wins on clear topical conflict
  // (e.g. science PDF uploaded under a Math subject tab).
  if (subjectDomain !== "unknown") {
    if (contentBest === "unknown" || contentScore < 3) return subjectDomain;
    if (contentBest === subjectDomain) return subjectDomain;
    if (contentScore >= 5 && scores[subjectDomain] < contentScore - 2) {
      return contentBest;
    }
    return subjectDomain;
  }

  return contentScore >= 2 ? contentBest : "unknown";
}

/** Build a searchable catalog from curated curriculum videos (real IDs only). */
export function getLessonVideoCatalog(): CatalogVideo[] {
  const seen = new Set<string>();
  const catalog: CatalogVideo[] = [];

  for (const lesson of Object.values(LESSONS) as Lesson[]) {
    if (!lesson.youtubeVideoId || seen.has(lesson.youtubeVideoId)) continue;
    seen.add(lesson.youtubeVideoId);

    const domain = domainFromUnitTag(lesson.unitTag);
    const blob = [
      lesson.unitTag,
      lesson.title,
      ...(lesson.teach ?? []),
      lesson.tip,
      lesson.youtubeTitle,
    ]
      .filter(Boolean)
      .join(" ");

    catalog.push({
      youtubeVideoId: lesson.youtubeVideoId,
      youtubeTitle: lesson.youtubeTitle ?? lesson.title,
      youtubeChannel: lesson.youtubeChannel ?? "Crash Course Kids",
      keywords: [...new Set(tokenize(blob))],
      topics: UNIT_TOPICS[lesson.unitTag] ?? [],
      transcript:
        lesson.transcript?.trim() ||
        [
          `Here is a readable version of this lesson on ${lesson.title}.`,
          "",
          ...(lesson.teach ?? []),
          "",
          lesson.tip ? `Coach tip: ${lesson.tip}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      sourceUnitTag: lesson.unitTag,
      domain,
    });
  }

  for (const extra of getExtraCuratedVideos()) {
    if (seen.has(extra.youtubeVideoId)) continue;
    seen.add(extra.youtubeVideoId);
    catalog.push({
      ...extra,
      topics: extra.topics as VideoTopic[],
    });
  }

  return catalog;
}

export type VideoMatch = {
  youtubeVideoId: string;
  youtubeTitle: string;
  youtubeChannel: string;
  transcript: string;
  score: number;
  sourceUnitTag: string;
};

function scoreVideo(
  video: CatalogVideo,
  querySet: Set<string>,
  titleQuery: Set<string>,
  queryTopics: VideoTopic[],
): number {
  let score = 0;

  // Cap generic keyword overlap so shared words can't dominate topic routing.
  let kwHits = 0;
  for (const kw of video.keywords) {
    if (querySet.has(kw)) kwHits += 1;
  }
  score += Math.min(kwHits, 5);

  for (const t of tokenize(video.youtubeTitle)) {
    if (querySet.has(t)) score += 2;
    if (titleQuery.has(t)) score += 4;
  }
  for (const t of tokenize(video.sourceUnitTag.replace(/_/g, " "))) {
    if (t === "math" || t === "sci" || t === "ela" || t === "ss" || t === "extra")
      continue;
    if (querySet.has(t)) score += 2;
  }

  // Topic affinity — primary signal across every subject.
  if (queryTopics.length && video.topics.length) {
    const overlap = video.topics.filter((t) => queryTopics.includes(t));
    if (overlap.length) {
      score += 50 * overlap.length;
    } else {
      const qFamilies = new Set(queryTopics.map(topicFamily));
      const vFamilies = video.topics.map(topicFamily);
      const sameFamily = vFamilies.some((f) => qFamilies.has(f));
      // Wrong skill in the same subject family (e.g. volume vs long division,
      // matter vs ecosystems, hero vs roots) gets a hard penalty.
      score -= sameFamily ? 40 : 15;
    }
  }

  return score;
}

/**
 * Pick the best curated YouTube lesson for a parent-uploaded worksheet topic.
 * Never invents video IDs — only matches the curated catalog.
 * Domain gating + topic routing keep math/science/ELA/SS/reading videos specific.
 */
export function matchLessonVideo(input: {
  title?: string;
  teach?: string[];
  tip?: string;
  unitTag?: string;
  subjectHint?: string;
  pdfExcerpt?: string;
}): VideoMatch | null {
  const catalog = getLessonVideoCatalog();
  if (!catalog.length) return null;

  const domain = detectLessonDomain(input);

  // Title + teach drive topic detection; PDF is supporting evidence only.
  const focusBlob = [input.title, ...(input.teach ?? []), input.tip]
    .filter(Boolean)
    .join(" ");
  const pdfBlob = (input.pdfExcerpt ?? "").slice(0, 1800);
  const queryTopics = detectVideoTopicsFromParts(focusBlob, pdfBlob);

  const titleQuery = new Set(tokenize(input.title ?? ""));
  const queryTokens = [
    ...tokenize(focusBlob),
    // Light PDF signal — avoid letting worksheet boilerplate overwhelm the title.
    ...tokenize(pdfBlob).slice(0, 40),
    ...(domain === "unknown" && input.unitTag
      ? tokenize(input.unitTag.replace(/_/g, " "))
      : []),
  ];

  if (!queryTokens.length && !queryTopics.length) return null;
  const querySet = new Set(queryTokens);

  let pool =
    domain === "unknown"
      ? catalog
      : catalog.filter((v) => v.domain === domain || v.domain === "unknown");

  // If we know the skill, prefer videos tagged for that skill.
  if (queryTopics.length) {
    const topicPool = pool.filter((v) =>
      v.topics.some((t) => queryTopics.includes(t)),
    );
    if (topicPool.length) pool = topicPool;
  }

  // If domain is known but pool empty, do not fall back to other subjects.
  if (!pool.length) return null;

  let best: VideoMatch | null = null;
  for (const video of pool) {
    const score = scoreVideo(video, querySet, titleQuery, queryTopics);
    if (!best || score > best.score) {
      best = {
        youtubeVideoId: video.youtubeVideoId,
        youtubeTitle: video.youtubeTitle,
        youtubeChannel: video.youtubeChannel,
        transcript: video.transcript,
        score,
        sourceUnitTag: video.sourceUnitTag,
      };
    }
  }

  const minScore =
    queryTopics.length > 0 ? 25 : domain === "unknown" ? 10 : 18;
  if (!best || best.score < minScore) return null;
  return best;
}

/**
 * Attach (or refresh) the best curated video onto a lesson payload.
 * Clears a previous video if nothing confident matches — better than a wrong one.
 */
export function attachMatchedVideoToPayload<
  T extends {
    title: string;
    teach: string[];
    tip?: string;
    unitTag?: string;
    transcript?: string;
    youtubeVideoId?: string;
    youtubeTitle?: string;
    youtubeChannel?: string;
  },
>(
  payload: T,
  opts?: { subjectHint?: string; pdfExcerpt?: string },
): T & {
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeChannel?: string;
  transcript?: string;
} {
  const matched = matchLessonVideo({
    title: payload.title,
    teach: payload.teach,
    tip: payload.tip,
    unitTag: payload.unitTag,
    subjectHint: opts?.subjectHint,
    pdfExcerpt: opts?.pdfExcerpt,
  });

  if (!matched) {
    return {
      ...payload,
      youtubeVideoId: undefined,
      youtubeTitle: undefined,
      youtubeChannel: undefined,
    };
  }

  return {
    ...payload,
    youtubeVideoId: matched.youtubeVideoId,
    youtubeTitle: matched.youtubeTitle,
    youtubeChannel: matched.youtubeChannel,
    transcript: payload.transcript?.trim()
      ? payload.transcript
      : matched.transcript,
  };
}

/** Build a student-facing reading transcript when the draft omitted one. */
export function buildFallbackTranscript(input: {
  title: string;
  teach: string[];
  tip?: string;
}): string {
  return [
    `Here is a readable version of this lesson on ${input.title}.`,
    "",
    ...input.teach,
    "",
    input.tip ? `Coach tip: ${input.tip}` : "",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .trim();
}
