/**
 * @deprecated Prefer `@/lib/arcade` + `@/components/arcade/ArcadeHub`.
 * Thin compatibility layer for Math Arcade imports.
 */

import {
  arcadeByKey,
  modeById as subjectModeById,
  pickRecommendedMode as pickSubjectMode,
  type RecommendedMode,
} from "@/lib/arcade/index";
import type { ArcadeMode } from "@/lib/arcade/types";

export type { ArcadeChoiceQuestion } from "@/lib/arcade/types";
export type { ArcadeTheme as MathArcadeTheme } from "@/lib/arcade/types";
export type MathArcadeMode = ArcadeMode;

export type MathArcadeModeId =
  | "number-dash"
  | "fraction-flight"
  | "decimal-dash"
  | "volume-vault"
  | "powers-pulse";

export {
  MATH_MODES as MATH_ARCADE_MODES,
  mathQuestionsForMode as questionsForMode,
} from "@/lib/arcade/catalogs/math";
export {
  nextQuestion,
  starsForRun,
  ARCADE_XP_TODO as MATH_ARCADE_XP_TODO,
} from "@/lib/arcade/questions";

const MATH = arcadeByKey("math");

export function modeById(id: MathArcadeModeId | string): ArcadeMode {
  return subjectModeById(MATH, id);
}

export function modeForUnitTag(unitTag: string | null | undefined): ArcadeMode {
  if (!unitTag) return modeById(MATH.defaultModeId);
  const match = MATH.modes.find((m) => m.unitTags.includes(unitTag));
  return match ?? modeById(MATH.defaultModeId);
}

export function pickRecommendedMode(
  tasks: Array<{ id: string; unit_tag?: string | null }>,
  masteredIds: Set<string>,
): RecommendedMode {
  return pickSubjectMode(MATH, tasks, masteredIds);
}
