/** localStorage progress for how-to shorts (per user, per browser). */

const PREFIX = "howto-shorts:v1:";

type Progress = {
  seen: string[];
  tourComplete: boolean;
};

function storageKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

function emptyProgress(): Progress {
  return { seen: [], tourComplete: false };
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

export function resetAllHowToTips(userId: string) {
  write(userId, emptyProgress());
}

export function getHowToProgress(userId: string): Progress {
  return read(userId);
}
