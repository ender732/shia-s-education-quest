/** Shared helpers for arcade question banks and practice stars. */

import type { ArcadeChoiceQuestion } from "@/lib/arcade/types";

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export type StaticMcItem = {
  prompt: string;
  answer: string;
  wrong: string[];
  tip: string;
};

export function mcFromBank(
  prefix: string,
  hardness: 1 | 2 | 3,
  easy: StaticMcItem[],
  mid: StaticMcItem[],
  hard: StaticMcItem[],
): ArcadeChoiceQuestion[] {
  const items =
    hardness === 1
      ? [...easy, ...mid.slice(0, 1)]
      : hardness === 2
        ? [...mid, ...hard.slice(0, 1)]
        : hard;
  return items.map((item, i) => {
    const choices = shuffle([item.answer, ...item.wrong]);
    return {
      id: `${prefix}-h${hardness}-${i}`,
      prompt: item.prompt,
      choices,
      correctIndex: choices.indexOf(item.answer),
      tip: item.tip,
    };
  });
}

export function nextQuestion(
  deck: ArcadeChoiceQuestion[],
  usedIds: Set<string>,
): ArcadeChoiceQuestion {
  const unused = deck.filter((q) => !usedIds.has(q.id));
  if (unused.length > 0) return pick(unused);
  return pick(deck);
}

/** Soft practice bonus — not wired to profile XP (avoid mastery conflicts). */
export function starsForRun(
  score: number,
  corrects: number,
  deaths: number,
  opts?: { isBoss?: boolean; heartsLeft?: number },
): 1 | 2 | 3 {
  if (opts?.isBoss) {
    if (deaths === 0 && corrects >= 4) return 3;
    if (corrects >= 3 || (opts.heartsLeft ?? 0) > 0) return 2;
    return 1;
  }
  if (corrects >= 4 && deaths === 0 && score >= 1200) return 3;
  if (corrects >= 2 && score >= 600) return 2;
  return 1;
}

/** TODO: optional tiny XP award via profiles — keep separate from lesson mastery. */
export const ARCADE_XP_TODO =
  "Wire optional practice XP (e.g. +5–15 once/day) without touching task mastery.";
