/** Global lock so tour and contextual shorts never overlap. */
let activeOwner: string | null = null;
let version = 0;
const listeners = new Set<() => void>();

function bump() {
  version += 1;
  listeners.forEach((l) => l());
}

export function claimHowToSlot(ownerId: string): boolean {
  if (activeOwner && activeOwner !== ownerId) return false;
  activeOwner = ownerId;
  bump();
  return true;
}

export function releaseHowToSlot(ownerId: string) {
  if (activeOwner !== ownerId) return;
  activeOwner = null;
  bump();
}

export function isHowToSlotFree(ownerId?: string): boolean {
  if (!activeOwner) return true;
  return ownerId ? activeOwner === ownerId : false;
}

export function getHowToSlotOwner(): string | null {
  return activeOwner;
}

export function getHowToSlotVersion(): number {
  return version;
}

export function subscribeHowToSlot(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
