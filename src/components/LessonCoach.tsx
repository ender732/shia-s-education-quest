import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { askLessonCoach } from "@/lib/lesson-coach.functions";

export type CoachChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type LessonCoachProps = {
  lessonTitle: string;
  /** Teach notes + tip — no answer keys. */
  lessonContext: string;
  /** Current quiz / worksheet stem only (optional). */
  questionText?: string;
  /** Hidden answer-key notes for the coach only (never shown in the UI). */
  privateHints?: string;
};

const MAX_INPUT = 500;

export function LessonCoach({
  lessonTitle,
  lessonContext,
  questionText,
  privateHints,
}: LessonCoachProps) {
  const panelId = useId();
  const askCoach = useServerFn(askLessonCoach);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      // Focus after expand for keyboard / VoiceOver users
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 2000),
      }));
      return askCoach({
        data: {
          lessonTitle,
          lessonContext,
          questionText: questionText || undefined,
          privateHints: privateHints || undefined,
          userMessage: text,
          history,
        },
      });
    },
    onSuccess: (result, text) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: "user",
          content: text,
        },
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.reply,
        },
      ]);
      setDraft("");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || send.isPending) return;
    if (text.length > MAX_INPUT) return;
    send.mutate(text);
  }

  return (
    <div className="rounded-xl border border-border bg-background/50">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-12 items-center justify-between gap-2 px-4 py-3 text-left text-sm font-bold"
      >
        <span className="inline-flex items-center gap-2">
          <MessageCircle className="size-4 shrink-0 text-primary" aria-hidden />
          Ask AI Coach
        </span>
        {open ? (
          <X className="size-4 text-muted-foreground" aria-hidden />
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">Tap to open</span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className="space-y-3 border-t border-border px-3 pb-3 pt-2"
          role="region"
          aria-label="AI Coach chat"
        >
          <p className="text-xs text-muted-foreground">
            Ask for help while you fill the worksheet yourself. The coach gives hints — not
            finished answers.
          </p>

          <div
            ref={listRef}
            className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border bg-background/60 p-2"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Example: &ldquo;I don&apos;t get the tip — can you explain it another way?&rdquo;
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-6 bg-primary/15 text-foreground"
                    : "mr-6 border border-border bg-secondary/40 text-foreground"
                }`}
              >
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {m.role === "user" ? "You" : "Coach"}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>

          {send.isError && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {send.error instanceof Error
                ? send.error.message
                : "Could not reach the AI coach. Try again."}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              Your question for the AI coach
            </label>
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={2}
              maxLength={MAX_INPUT}
              value={draft}
              disabled={send.isPending}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a question about this lesson…"
              className="input-base min-h-12 flex-1 resize-none text-base"
            />
            <button
              type="submit"
              disabled={send.isPending || !draft.trim()}
              aria-label="Send question to AI coach"
              className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {send.isPending ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-5" aria-hidden />
              )}
            </button>
          </form>
          <p className="text-right text-[10px] text-muted-foreground">
            {draft.length}/{MAX_INPUT}
          </p>
        </div>
      )}
    </div>
  );
}
