/** Normalize email for allowlist comparison (trim + lowercase). */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** Parse VITE_PARENT_EMAILS (comma-separated) into a normalized set. */
export function getParentEmailAllowlist(): Set<string> {
  const raw = import.meta.env.VITE_PARENT_EMAILS as string | undefined;
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => normalizeEmail(e))
      .filter(Boolean),
  );
}

/** Parent Portal is gated solely by the email allowlist. */
export function canAccessParentPortal(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getParentEmailAllowlist().has(normalized);
}
