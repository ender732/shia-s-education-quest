/** Parent portal access is based on verified profile role — not an email allowlist. */

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** Whole years of age from an ISO date string (YYYY-MM-DD). */
export function ageFromDob(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(birth.getTime()) ||
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return null;
  }
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function isAdultDob(dob: string | null | undefined, now = new Date()): boolean {
  const age = ageFromDob(dob, now);
  return age !== null && age >= 18;
}

/**
 * Authoritative role from signup intent.
 * Parent only when the adult path is taken, DOB is 18+, and confirmation is checked.
 */
export function resolveAuthoritativeRole(input: {
  wantsParent: boolean;
  dateOfBirth?: string | null;
  confirmedParentGuardian?: boolean;
}): "parent" | "student" {
  if (!input.wantsParent) return "student";
  if (!input.confirmedParentGuardian) return "student";
  if (!isAdultDob(input.dateOfBirth)) return "student";
  return "parent";
}

/** Parent Portal UI gate: verified parent profile role only. */
export function canAccessParentPortal(role: string | null | undefined): boolean {
  return (role ?? "").trim().toLowerCase() === "parent";
}

/** Admin analytics UI gate: profiles.role = admin only (set via SQL, not client). */
export function canAccessAdmin(role: string | null | undefined): boolean {
  return (role ?? "").trim().toLowerCase() === "admin";
}
