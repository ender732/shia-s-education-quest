import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Shows the student's shareable parent link code with copy-to-clipboard. */
export function ParentLinkCodeCard({ linkCode }: { linkCode: string | null | undefined }) {
  const [copied, setCopied] = useState(false);

  if (!linkCode) {
    return (
      <div className="surface-card border-dashed p-4 text-sm text-muted-foreground">
        Parent link code is not available yet. Ask an adult to run the latest database migration
        (<code className="text-xs">parent_student_links</code>), then refresh.
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

  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
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
  );
}
