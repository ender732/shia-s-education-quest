import { LESSONS, type Lesson } from "@/lib/curriculum";

export type CatalogVideo = {
  youtubeVideoId: string;
  youtubeTitle: string;
  youtubeChannel: string;
  /** Searchable tokens derived from curriculum lesson metadata. */
  keywords: string[];
  /** Readable transcript paired with the video. */
  transcript: string;
  sourceUnitTag: string;
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
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Build a searchable catalog from curated curriculum videos (real IDs only). */
export function getLessonVideoCatalog(): CatalogVideo[] {
  const seen = new Set<string>();
  const catalog: CatalogVideo[] = [];

  for (const lesson of Object.values(LESSONS) as Lesson[]) {
    if (!lesson.youtubeVideoId || seen.has(lesson.youtubeVideoId)) continue;
    seen.add(lesson.youtubeVideoId);

    const blob = [
      lesson.unitTag,
      lesson.title,
      ...(lesson.teach ?? []),
      lesson.tip,
      lesson.youtubeTitle,
      lesson.youtubeChannel,
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

/**
 * Pick the best curated YouTube lesson for a parent-uploaded worksheet topic.
 * Never invents video IDs — only matches the existing curriculum catalog.
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

  const queryTokens = [
    ...tokenize(
      [
        input.title,
        input.unitTag,
        input.subjectHint,
        input.tip,
        ...(input.teach ?? []),
        // Keep PDF excerpt short — enough for topic signals, not the whole answer key.
        (input.pdfExcerpt ?? "").slice(0, 1500),
      ]
        .filter(Boolean)
        .join(" "),
    ),
  ];

  if (!queryTokens.length) return null;

  const querySet = new Set(queryTokens);
  let best: VideoMatch | null = null;

  for (const video of catalog) {
    let score = 0;
    for (const kw of video.keywords) {
      if (querySet.has(kw)) score += 1;
    }
    // Title phrase bonus: overlapping distinctive words matter more.
    const titleTokens = tokenize(video.youtubeTitle);
    for (const t of titleTokens) {
      if (querySet.has(t)) score += 2;
    }
    const unitBits = tokenize(video.sourceUnitTag.replace(/_/g, " "));
    for (const u of unitBits) {
      if (querySet.has(u)) score += 2;
    }

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

  // Require a real topical signal so we don't glue a random math video onto science.
  if (!best || best.score < 3) return null;
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
