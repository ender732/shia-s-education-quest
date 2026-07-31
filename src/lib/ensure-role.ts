import type { User } from "@supabase/supabase-js";
import { clearAuthIntent, readAuthIntent, type AuthSignupIntent } from "@/lib/auth-intent";
import {
  isAdultDob,
  normalizeEmail,
  resolveAuthoritativeRole,
} from "@/lib/parent-access";
import { sendParentLinkCodeEmail, sendParentWelcomeEmail } from "@/lib/parent-link-email.functions";
import { supabase } from "@/integrations/supabase/client";

export type EnsureRoleResult = {
  role: "parent" | "student" | "admin";
  linkCode: string | null;
  parentContactEmail: string | null;
  forcedStudentReason?: "under_18" | "missing_confirmation" | null;
  emailedParent?: boolean;
  emailStatus?: "sent" | "not_configured" | "failed" | "skipped";
};

export type UpgradeToParentResult =
  | { ok: true; role: "parent" }
  | { ok: false; reason: "not_student" | "under_18" | "missing_confirmation" | "invalid_dob" | string };

/**
 * After signup or Google OAuth redirect with a stored intent: apply authoritative role
 * from age verification + confirmation. Without an intent (normal sign-in), leave role alone.
 */
export async function ensureProfileRole(
  user: User,
  intentOverride?: AuthSignupIntent | null,
): Promise<EnsureRoleResult> {
  const intent = intentOverride === undefined ? readAuthIntent() : intentOverride;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, link_code, role, parent_contact_email, display_name")
    .eq("id", user.id)
    .maybeSingle();

  // Never overwrite an operator admin role from client signup flows.
  if ((existing?.role as string) === "admin") {
    return {
      role: "admin",
      linkCode: (existing?.link_code as string | null) ?? null,
      parentContactEmail: normalizeEmail(existing?.parent_contact_email as string | null) || null,
      emailStatus: "skipped",
    };
  }

  // No signup intent → do not rewrite role (returning users / Google sign-in).
  if (!intent) {
    return {
      role: ((existing?.role as "parent" | "student" | "admin") ?? "student"),
      linkCode: (existing?.link_code as string | null) ?? null,
      parentContactEmail: normalizeEmail(existing?.parent_contact_email as string | null) || null,
      emailStatus: "skipped",
    };
  }

  const wantsParent = intent.path === "parent";
  const dob = intent.dateOfBirth ?? null;
  const confirmed = Boolean(intent.confirmedParentGuardian);

  let forcedStudentReason: EnsureRoleResult["forcedStudentReason"] = null;
  if (wantsParent) {
    if (!confirmed) forcedStudentReason = "missing_confirmation";
    else if (
      resolveAuthoritativeRole({
        wantsParent: true,
        dateOfBirth: dob,
        confirmedParentGuardian: true,
      }) !== "parent"
    ) {
      forcedStudentReason = "under_18";
    }
  }

  const role = resolveAuthoritativeRole({
    wantsParent,
    dateOfBirth: dob,
    confirmedParentGuardian: confirmed,
  });

  const parentContactEmail =
    role === "student" ? normalizeEmail(intent.parentContactEmail) || null : null;

  const displayName =
    intent.displayName?.trim() ||
    (user.user_metadata?.display_name as string | undefined) ||
    existing?.display_name ||
    user.email?.split("@")[0] ||
    "Explorer";

  const updates: {
    role: "parent" | "student";
    display_name: string;
    date_of_birth?: string;
    age_verified_at?: string;
    parent_contact_email?: string;
  } = {
    role,
    display_name: displayName,
  };

  if (role === "parent" && dob) {
    updates.date_of_birth = dob;
    updates.age_verified_at = new Date().toISOString();
  }

  if (parentContactEmail) {
    updates.parent_contact_email = parentContactEmail;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      ...updates,
    });
    if (insertError) throw new Error(insertError.message);
  } else {
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (updateError) throw new Error(updateError.message);
  }

  await supabase.auth.updateUser({
    data: {
      role,
      display_name: displayName,
      ...(parentContactEmail ? { parent_contact_email: parentContactEmail } : {}),
    },
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("link_code, parent_contact_email, role")
    .eq("id", user.id)
    .maybeSingle();

  const linkCode = (profile?.link_code as string | null) ?? null;
  const storedParentEmail =
    normalizeEmail(profile?.parent_contact_email as string | null) || parentContactEmail;

  let emailStatus: EnsureRoleResult["emailStatus"] = "skipped";
  let emailedParent = false;

  if (role === "student" && linkCode && storedParentEmail) {
    try {
      const result = await sendParentLinkCodeEmail({
        data: {
          parentEmail: storedParentEmail,
          linkCode,
          studentName: displayName,
        },
      });
      emailStatus = result.status;
      emailedParent = result.status === "sent";
    } catch {
      emailStatus = "failed";
    }
  }

  if (role === "parent" && user.email) {
    try {
      await sendParentWelcomeEmail({ data: { parentEmail: user.email } });
    } catch {
      // optional welcome
    }
  }

  clearAuthIntent();

  return {
    role: (profile?.role as "parent" | "student") ?? role,
    linkCode,
    parentContactEmail: storedParentEmail,
    forcedStudentReason,
    emailedParent,
    emailStatus,
  };
}

/**
 * One-time student → parent upgrade after 18+ DOB + confirmation.
 * Satisfies DB trigger guard_profile_parent_role (date_of_birth + age_verified_at).
 */
export async function upgradeStudentToParent(
  user: User,
  input: { dateOfBirth: string; confirmedParentGuardian: boolean },
): Promise<UpgradeToParentResult> {
  if (!input.confirmedParentGuardian) {
    return { ok: false, reason: "missing_confirmation" };
  }
  if (!input.dateOfBirth.trim()) {
    return { ok: false, reason: "invalid_dob" };
  }
  if (!isAdultDob(input.dateOfBirth)) {
    return { ok: false, reason: "under_18" };
  }

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) return { ok: false, reason: readError.message };
  if (!existing) return { ok: false, reason: "Profile not found." };
  if ((existing.role as string) === "admin") {
    return { ok: false, reason: "not_student" };
  }
  if ((existing.role as string) === "parent") {
    return { ok: true, role: "parent" };
  }
  if ((existing.role as string) !== "student") {
    return { ok: false, reason: "not_student" };
  }

  const ageVerifiedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      role: "parent",
      date_of_birth: input.dateOfBirth,
      age_verified_at: ageVerifiedAt,
      parent_contact_email: null,
    })
    .eq("id", user.id);

  if (updateError) return { ok: false, reason: updateError.message };

  await supabase.auth.updateUser({
    data: { role: "parent" },
  });

  if (user.email) {
    try {
      await sendParentWelcomeEmail({ data: { parentEmail: user.email } });
    } catch {
      // optional welcome
    }
  }

  clearAuthIntent();
  return { ok: true, role: "parent" };
}
