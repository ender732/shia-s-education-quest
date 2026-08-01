import { LESSONS, type Lesson } from "@/lib/curriculum";

export type CatalogVideo = {
  youtubeVideoId: string;
  youtubeTitle: string;
  youtubeChannel: string;
  /** Searchable topic tokens (domain-stripped of boilerplate). */
  keywords: string[];
  /** Readable transcript paired with the video. */
  transcript: string;
  sourceUnitTag: string;
  domain: LessonDomain;
};

export type LessonDomain = "math" | "ela" | "sci" | "ss" | "read" | "unknown";

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
    "biology",
    "physics",
    "chemistry",
    "nyssls",
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
  if (/\bmath|mathematics|arithmetic\b/.test(subject)) subjectDomain = "math";
  else if (/\bela|english|literacy|language\b/.test(subject)) subjectDomain = "ela";
  else if (/\bsci|science|stem|earth|space|biology|physics\b/.test(subject))
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
): number {
  let score = 0;
  for (const kw of video.keywords) {
    if (querySet.has(kw)) score += 1;
  }
  for (const t of tokenize(video.youtubeTitle)) {
    if (querySet.has(t)) score += 3;
    if (titleQuery.has(t)) score += 4;
  }
  for (const t of tokenize(video.sourceUnitTag.replace(/_/g, " "))) {
    if (t === "math" || t === "sci" || t === "ela" || t === "ss") continue;
    if (querySet.has(t)) score += 2;
  }
  return score;
}

/**
 * Pick the best curated YouTube lesson for a parent-uploaded worksheet topic.
 * Never invents video IDs — only matches the existing curriculum catalog.
 * Subject/domain gating prevents science PDFs from attaching Math Antics videos.
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
  const titleQuery = new Set(tokenize(input.title ?? ""));
  const queryTokens = tokenize(
    [
      input.title,
      input.subjectHint,
      input.tip,
      ...(input.teach ?? []),
      // Prefer content over AI unitTag; include tag lightly only if domain unknown
      domain === "unknown" ? input.unitTag : null,
      (input.pdfExcerpt ?? "").slice(0, 1500),
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (!queryTokens.length) return null;
  const querySet = new Set(queryTokens);

  const pool =
    domain === "unknown"
      ? catalog
      : catalog.filter((v) => v.domain === domain || v.domain === "unknown");

  // If domain is known but pool empty, do not fall back to other subjects.
  if (!pool.length) return null;

  let best: VideoMatch | null = null;
  for (const video of pool) {
    const score = scoreVideo(video, querySet, titleQuery);
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

  // Same-domain matches need a real topic signal; unknown domain needs a stronger one.
  const minScore = domain === "unknown" ? 6 : 3;
  if (!best || best.score < minScore) return null;
  return best;
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
