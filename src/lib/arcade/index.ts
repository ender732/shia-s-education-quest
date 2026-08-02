/** Subject arcade registry — resolve dashboard subject titles → catalogs. */

import { ELA_MODES, elaQuestionsForMode } from "@/lib/arcade/catalogs/ela";
import { MATH_MODES, mathQuestionsForMode } from "@/lib/arcade/catalogs/math";
import { READING_MODES, readingQuestionsForMode } from "@/lib/arcade/catalogs/reading";
import { SCIENCE_MODES, scienceQuestionsForMode } from "@/lib/arcade/catalogs/science";
import { SOCIAL_MODES, socialQuestionsForMode } from "@/lib/arcade/catalogs/social";
import type {
  ArcadeMode,
  ArcadeSubjectDef,
  ArcadeSubjectKey,
} from "@/lib/arcade/types";

export type { ArcadeMode, ArcadeSubjectDef, ArcadeSubjectKey };
export type { ArcadeChoiceQuestion, ArcadeTheme } from "@/lib/arcade/types";
export { intensifyBossTheme } from "@/lib/arcade/types";

export const ARCADE_SUBJECTS: ArcadeSubjectDef[] = [
  {
    key: "math",
    titles: ["Math"],
    hubTitle: "Math Arcade",
    campaignTitle: "Number Dash Campaign",
    description:
      "Climb Levels 1–4, then beat the Boss. Topic themes follow your Math units. Lessons still earn the real XP on the TaskBoard below.",
    accent: "math",
    unitPrefix: "187_MATH",
    defaultModeId: "number-dash",
    modes: MATH_MODES,
    questionsForMode: mathQuestionsForMode,
  },
  {
    key: "ela",
    titles: ["ELA / Reading"],
    hubTitle: "ELA Arcade",
    campaignTitle: "Story Dash Campaign",
    description:
      "Vocabulary, main idea, figurative language, and grammar portals. Practice stars only — lesson XP stays on your TaskBoard.",
    accent: "ela",
    unitPrefix: "187_ELA",
    defaultModeId: "story-sprint",
    modes: ELA_MODES,
    questionsForMode: elaQuestionsForMode,
  },
  {
    key: "science",
    titles: ["Science (NYSSLS)"],
    hubTitle: "Science Arcade",
    campaignTitle: "Matter Dash Campaign",
    description:
      "Ecosystems, matter, Earth systems, and starlight gates. Practice stars only — lessons keep the real XP.",
    accent: "science",
    unitPrefix: "187_SCI",
    defaultModeId: "matter-dash",
    modes: SCIENCE_MODES,
    questionsForMode: scienceQuestionsForMode,
  },
  {
    key: "social",
    titles: ["Social Studies (Western Hemisphere)"],
    hubTitle: "Social Studies Arcade",
    campaignTitle: "Map Dash Campaign",
    description:
      "Geography, civilizations, exploration, and civics. Practice stars only — TaskBoard lessons earn mastery XP.",
    accent: "social",
    unitPrefix: "187_SS",
    defaultModeId: "map-dash",
    modes: SOCIAL_MODES,
    questionsForMode: socialQuestionsForMode,
  },
  {
    key: "reading",
    titles: ["Assigned Reading"],
    hubTitle: "Reading Arcade",
    campaignTitle: "Vocab Voyage Campaign",
    description:
      "Warm up vocab, comprehension, and RACECE before your book report. Practice stars only — Book Studio stays the real work.",
    accent: "reading",
    unitPrefix: "187_READ",
    defaultModeId: "vocab-voyage",
    modes: READING_MODES,
    questionsForMode: readingQuestionsForMode,
  },
];

const BY_TITLE = new Map<string, ArcadeSubjectDef>();
for (const s of ARCADE_SUBJECTS) {
  for (const t of s.titles) BY_TITLE.set(t, s);
}

export function arcadeForSubjectTitle(title: string | null | undefined): ArcadeSubjectDef | null {
  if (!title) return null;
  return BY_TITLE.get(title) ?? null;
}

export function arcadeByKey(key: ArcadeSubjectKey): ArcadeSubjectDef {
  return ARCADE_SUBJECTS.find((s) => s.key === key) ?? ARCADE_SUBJECTS[0]!;
}

export function modeById(subject: ArcadeSubjectDef, modeId: string): ArcadeMode {
  return subject.modes.find((m) => m.id === modeId) ?? subject.modes[0]!;
}

export function modeForUnitTag(
  subject: ArcadeSubjectDef,
  unitTag: string | null | undefined,
): ArcadeMode {
  if (!unitTag) return modeById(subject, subject.defaultModeId);
  const match = subject.modes.find((m) => m.unitTags.includes(unitTag));
  return match ?? modeById(subject, subject.defaultModeId);
}

/**
 * Prefer incomplete unit tasks for this subject; else any matching unit; else default.
 */
export function pickRecommendedMode(
  subject: ArcadeSubjectDef,
  tasks: Array<{ id: string; unit_tag?: string | null }>,
  masteredIds: Set<string>,
): { mode: ArcadeMode; reason: string; unitTag: string | null } {
  const tagged = tasks.filter(
    (t) =>
      t.unit_tag?.startsWith(subject.unitPrefix) ||
      subject.modes.some((m) => m.unitTags.includes(t.unit_tag ?? "")),
  );
  const incomplete = tagged.find((t) => t.unit_tag && !masteredIds.has(t.id));
  if (incomplete?.unit_tag) {
    const mode = modeForUnitTag(subject, incomplete.unit_tag);
    return {
      mode,
      unitTag: incomplete.unit_tag,
      reason: `Matched to your open unit · ${mode.title}`,
    };
  }
  const any = tagged.find((t) => t.unit_tag);
  if (any?.unit_tag) {
    const mode = modeForUnitTag(subject, any.unit_tag);
    return {
      mode,
      unitTag: any.unit_tag,
      reason: `Based on your ${subject.hubTitle.replace(" Arcade", "")} unit · ${mode.title}`,
    };
  }
  const mode = modeById(subject, subject.defaultModeId);
  return {
    mode,
    unitTag: null,
    reason: `Default ${mode.title} — practice while you wait for assignments`,
  };
}
