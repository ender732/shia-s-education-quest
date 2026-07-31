import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LinkCodeEmailInput = z.object({
  parentEmail: z.string().email().max(320),
  linkCode: z.string().uuid(),
  studentName: z.string().max(120).default("Your student"),
});

const WelcomeInput = z.object({
  parentEmail: z.string().email().max(320),
});

export const sendParentLinkCodeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LinkCodeEmailInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Only the student who owns this link_code may trigger the email.
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, link_code, role, parent_contact_email, display_name")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Profile not found");
    if (profile.role === "parent") {
      throw new Error("Parent accounts do not share a student link code.");
    }
    if (profile.link_code !== data.linkCode) {
      throw new Error("Link code does not match your profile.");
    }

    const parentEmail = data.parentEmail.trim().toLowerCase();

    // Persist contact for later resends.
    await supabase
      .from("profiles")
      .update({ parent_contact_email: parentEmail })
      .eq("id", userId);

    const { sendTransactionalEmail, parentLinkCodeEmailContent } = await import(
      "./send-email.server"
    );
    const content = parentLinkCodeEmailContent({
      linkCode: data.linkCode,
      studentName: data.studentName || profile.display_name || "Your student",
    });

    const result = await sendTransactionalEmail({
      to: parentEmail,
      ...content,
    });

    return {
      status: result.status as "sent" | "not_configured" | "failed",
      message: result.status === "failed" ? result.message : undefined,
    };
  });

export const sendParentWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WelcomeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role !== "parent") {
      throw new Error("Welcome email is only for parent accounts.");
    }

    const claimEmail =
      typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    const to = data.parentEmail.trim().toLowerCase();
    if (claimEmail && to !== claimEmail) {
      throw new Error("Welcome email must go to your own account email.");
    }

    const { sendTransactionalEmail, parentWelcomeEmailContent } = await import(
      "./send-email.server"
    );
    const content = parentWelcomeEmailContent();
    const result = await sendTransactionalEmail({ to, ...content });
    return {
      status: result.status as "sent" | "not_configured" | "failed",
    };
  });
