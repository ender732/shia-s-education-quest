import { Check, Copy, Link2, Mail, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sendParentLinkCodeEmail } from "@/lib/parent-link-email.functions";

type Props = {
  linkCode: string | null | undefined;
  parentContactEmail?: string | null;
  studentName?: string | null;
};

/** Shows the student's shareable parent link code with copy + email resend. */
export function ParentLinkCodeCard({ linkCode, parentContactEmail, studentName }: Props) {
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
        Parent link code is not available yet. Ask an adult to run the latest database migration
        (<code className="text-xs">parent_age_and_contact</code> /{" "}
        <code className="text-xs">parent_student_links</code>), then refresh.
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(linkCode!);
      setCopied(true);
      toast.success("Parent link code copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select and copy the code manually.");
    }
  }

  async function emailParent() {
    const to = emailDraft.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error("Enter a valid parent/guardian email.");
      return;
    }
    setSending(true);
    try {
      const result = await sendFn({
        data: {
          parentEmail: to,
          linkCode: linkCode!,
          studentName: studentName || "Your student",
        },
      });
      if (result.status === "sent") {
        toast.success("Link code emailed to your parent/guardian.");
      } else if (result.status === "not_configured") {
        toast.message("Email not configured — copy the code and share it manually.");
      } else {
        toast.error(result.message || "Could not send email.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="surface-card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link2 className="size-3.5 text-primary" />
            Parent link code
          </p>
          <p className="mt-1 break-all font-mono text-sm font-semibold tracking-tight">{linkCode}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Share this code with a parent so they can follow your progress. Only they can see your
            quest after linking.
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold transition hover:bg-secondary"
        >
          {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
        <input
          className="input-base flex-1"
          type="email"
          placeholder="Parent/guardian email"
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
        />
        <button
          type="button"
          onClick={emailParent}
          disabled={sending}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold transition hover:bg-secondary disabled:opacity-60"
        >
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
          Email my parent the link code
        </button>
      </div>
    </div>
  );
}
