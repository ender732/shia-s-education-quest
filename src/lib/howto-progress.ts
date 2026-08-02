/** localStorage progress for how-to shorts (per user, per browser). */

const PREFIX = "howto-shorts:v1:";

type Progress = {
  seen: string[];
  tourComplete: boolean;
  /** When true, never auto-show contextual tips or the welcome tour. */
  tipsHidden: boolean;
};

let tipsHiddenVersion = 0;
const tipsHiddenListeners = new Set<() => void>();

function bumpTipsHidden() {
  tipsHiddenVersion += 1;
  tipsHiddenListeners.forEach((l) => l());
}

function storageKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

function emptyProgress(): Progress {
  return { seen: [], tourComplete: false, tipsHidden: false };
}

function read(userId: string): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      seen: Array.isArray(parsed.seen) ? parsed.seen.filter((id) => typeof id === "string") : [],
      tourComplete: Boolean(parsed.tourComplete),
      tipsHidden: Boolean(parsed.tipsHidden),
    };
  } catch {
    return emptyProgress();
  }
}

function write(userId: string, progress: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(progress));
  } catch {
    /* quota / private mode */
  }
}

export function isHowToShortSeen(userId: string, shortId: string): boolean {
  return read(userId).seen.includes(shortId);
}

export function markHowToShortSeen(userId: string, shortId: string) {
  const progress = read(userId);
  if (progress.seen.includes(shortId)) return;
  progress.seen.push(shortId);
  write(userId, progress);
}

export function isHowToTourComplete(userId: string, role: "student" | "parent"): boolean {
  return read(userId).tourComplete || isHowToShortSeen(userId, `tour:${role}`);
}

export function markHowToTourComplete(userId: string, role: "student" | "parent") {
  const progress = read(userId);
  progress.tourComplete = true;
  if (!progress.seen.includes(`tour:${role}`)) {
    progress.seen.push(`tour:${role}`);
  }
  write(userId, progress);
}

/** Skip tour playlist without marking every contextual short as seen. */
export function skipHowToTour(userId: string, role: "student" | "parent") {
  markHowToTourComplete(userId, role);
}

export function clearHowToTourComplete(userId: string, role: "student" | "parent") {
  const progress = read(userId);
  progress.tourComplete = false;
  progress.seen = progress.seen.filter((id) => id !== `tour:${role}`);
  write(userId, progress);
}

export function areHowToTipsHidden(userId: string): boolean {
  return read(userId).tipsHidden;
}

/** Suppress all auto-shown tips/tours. Manual Help replay still works. */
export function hideAllHowToTips(userId: string) {
  const progress = read(userId);
  progress.tipsHidden = true;
  progress.tourComplete = true;
  // Mark both role tour keys so switching student/parent views stays quiet.
  for (const r of ["student", "parent"] as const) {
    const key = `tour:${r}`;
    if (!progress.seen.includes(key)) progress.seen.push(key);
  }
  write(userId, progress);
  bumpTipsHidden();
}

export function showHowToTips(userId: string) {
  const progress = read(userId);
  if (!progress.tipsHidden) return;
  progress.tipsHidden = false;
  write(userId, progress);
  bumpTipsHidden();
}

export function resetAllHowToTips(userId: string) {
  write(userId, emptyProgress());
  bumpTipsHidden();
}

export function getHowToProgress(userId: string): Progress {
  return read(userId);
}

export function getHowToTipsHiddenVersion(): number {
  return tipsHiddenVersion;
}

export function subscribeHowToTipsHidden(listener: () => void): () => void {
  tipsHiddenListeners.add(listener);
  return () => tipsHiddenListeners.delete(listener);
}
