import type { User } from "@supabase/supabase-js";
import { clearAuthIntent, readAuthIntent, type AuthSignupIntent } from "@/lib/auth-intent";
import { normalizeEmail, resolveAuthoritativeRole } from "@/lib/parent-access";
import { sendParentLinkCodeEmail, sendParentWelcomeEmail } from "@/lib/parent-link-email.functions";
import { supabase } from "@/integrations/supabase/client";

export type EnsureRoleResult = {
  role: "parent" | "student";
  linkCode: string | null;
  parentContactEmail: string | null;
  forcedStudentReason?: "under_18" | "missing_confirmation" | null;
  emailedParent?: boolean;
  emailStatus?: "sent" | "not_configured" | "failed" | "skipped";
};

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

  // No signup intent → do not rewrite role (returning users / Google sign-in).
  if (!intent) {
    return {
      role: ((existing?.role as "parent" | "student") ?? "student"),
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
