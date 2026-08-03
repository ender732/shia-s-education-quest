import { Check, Copy, Link2, Mail, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { trackEvent } from "@/lib/analytics";
import { sendParentLinkCodeEmail } from "@/lib/parent-link-email.functions";

type Props = {
  linkCode: string | null | undefined;
  parentContactEmail?: string | null;
  studentName?: string | null;
};

/** Shows the student's shareable parent link code with copy + email resend. */
export function ParentLinkCodeCard({ linkCode, parentContactEmail, studentName }: Props) {
  const { t, tError } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [emailDraft, setEmailDraft] = useState(parentContactEmail ?? "");
  const [sending, setSending] = useState(false);
  const sendFn = useServerFn(sendParentLinkCodeEmail);

  useEffect(() => {
    if (parentContactEmail) setEmailDraft(parentContactEmail);
  }, [parentContactEmail]);

  if (!linkCode) {
    return (
      <div className="surface-card border-dashed p-4 text-sm text-muted-foreground">
        {t("linkCode.missing", { migrations: "parent_age_and_contact / parent_student_links" })}
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(linkCode!);
      setCopied(true);
      void trackEvent("copy_link", { kind: "parent_link_code" });
      toast.success(t("linkCode.copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("linkCode.copyFailed"));
    }
  }

  async function emailParent() {
    const to = emailDraft.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error(t("linkCode.emailInvalid"));
      return;
    }
    setSending(true);
    try {
      const result = await sendFn({
        data: {
          parentEmail: to,
          linkCode: linkCode!,
          studentName: studentName || t("linkCode.defaultStudentName"),
        },
      });
      if (result.status === "sent") {
        toast.success(t("linkCode.emailSent"));
      } else if (result.status === "not_configured") {
        toast.message(result.message || t("linkCode.emailNotConfigured"));
      } else {
        toast.error(result.message || t("linkCode.emailFailed"));
      }
    } catch (err) {
      toast.error(tError(err, "linkCode.emailFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="surface-card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link2 className="size-3.5 text-primary" aria-hidden />
            {t("linkCode.label")}
          </p>
          <p
            className="mt-1 break-all font-mono text-sm font-semibold tracking-tight"
            aria-label={t("linkCode.codeAria")}
          >
            {linkCode}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("linkCode.shareNote")}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold transition hover:bg-secondary"
        >
          {copied ? (
            <Check className="size-3.5 text-primary" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied ? t("common.copied") : t("common.copy")}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="parent-link-email">
          {t("linkCode.emailLabel")}
        </label>
        <input
          id="parent-link-email"
          className="input-base flex-1"
          type="email"
          placeholder={t("linkCode.emailPlaceholder")}
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
          autoComplete="email"
        />
        <button
          type="button"
          onClick={emailParent}
          disabled={sending}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold transition hover:bg-secondary disabled:opacity-60"
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Mail className="size-3.5" aria-hidden />
          )}
          {t("linkCode.emailButton")}
        </button>
      </div>
    </div>
  );
}
