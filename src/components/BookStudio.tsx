import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { celebrate } from "@/lib/confetti";
import { gradeBookReport } from "@/lib/grading.functions";

export type AssignedBook = {
  id: string;
  title: string;
  author: string | null;
  pdf_url: string | null;
  prompt: string | null;
};

type Feedback = {
  score: number;
  strengths: string;
  improvements: string;
  racece_checklist: Record<string, boolean>;
  teacher_note: string;
};

const RACECE_LABELS: Array<[string, string]> = [
  ["restate", "Restated the question"],
  ["answer", "Answered directly"],
  ["cite_1", "Cited evidence #1"],
  ["explain_1", "Explained evidence #1"],
  ["cite_2", "Cited evidence #2"],
  ["explain_2", "Explained evidence #2"],
];

export function useBooks() {
  return useQuery({
    queryKey: ["assigned_books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assigned_books")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssignedBook[];
    },
  });
}

export function BookStudio({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data: books, isLoading, isError } = useBooks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chapter, setChapter] = useState("");
  const [reportText, setReportText] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const selected = useMemo(
    () => books?.find((b) => b.id === selectedId) ?? books?.[0] ?? null,
    [books, selectedId],
  );

  const { data: signedUrl } = useQuery({
    queryKey: ["book-url", selected?.pdf_url],
    enabled: Boolean(selected?.pdf_url),
    queryFn: async () => {
      const path = selected!.pdf_url!;
      if (path.startsWith("http")) return path;
      const { data, error } = await supabase.storage
        .from("assigned-books")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  const gradeFn = useServerFn(gradeBookReport);

  const grade = useMutation({
    mutationFn: async () =>
      gradeFn({
        data: {
          bookId: selected?.id ?? null,
          bookTitle: selected?.title ?? "",
          chapter,
          reportText,
        },
      }),
    onSuccess: (result) => {
      setFeedback(result.feedback as Feedback);
      void celebrate();
      toast.success(`Graded! +${result.xpAwarded} XP earned`);
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["book_reports"] });
    },
    onError: (err: Error) => toast.error(err.message || "Grading failed. Try again."),
  });

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your library…
        </div>
      )}
      {isError && (
        <div className="surface-card p-6 text-sm text-destructive">
          We couldn&apos;t load the reading library.
        </div>
      )}

      {books && books.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => setSelectedId(book.id)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                selected?.id === book.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {book.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Reader */}
        <div className="surface-card flex min-h-[26rem] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <BookOpen className="size-4 text-reading" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{selected?.title ?? "No book selected"}</p>
              {selected?.author && (
                <p className="truncate text-xs text-muted-foreground">by {selected.author}</p>
              )}
            </div>
          </div>
          {signedUrl ? (
            <iframe
              title={selected?.title ?? "Assigned book"}
              src={signedUrl}
              className="h-[30rem] w-full flex-1 bg-background"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {selected
                ? "This book has no PDF attached yet."
                : "No assigned books yet. A parent can upload one from the Parent Portal."}
            </div>
          )}
          {selected?.prompt && (
            <div className="border-t border-border bg-background/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">Reading prompt: </span>
              {selected.prompt}
            </div>
          )}
        </div>

        {/* Report form */}
        <div className="surface-card flex flex-col gap-3 p-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Book title / chapter
            </label>
            <input
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="Chapter 4 — The Storm"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-1 flex-col">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Summary &amp; analysis (use RACECE)
            </label>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={12}
              placeholder="Restate the question, answer it, cite two pieces of text evidence, and explain each one…"
              className="mt-1 min-h-48 w-full flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {reportText.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
          <button
            onClick={() => grade.mutate()}
            disabled={grade.isPending || reportText.trim().length < 40}
            className="glow-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {grade.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> AI Teacher is reading…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Submit to AI Teacher for Grading
              </>
            )}
          </button>
        </div>
      </div>

      {feedback && <FeedbackCard feedback={feedback} />}
    </div>
  );
}

export function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card overflow-hidden"
    >
      <div className="hero-gradient flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-primary" /> AI Teacher Report Card
        </div>
        <div className="text-2xl font-black text-xp">{feedback.score}/100</div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-success">Strengths</h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feedback.strengths}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ela">
            Improvements for next time
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {feedback.improvements}
          </p>
        </div>
        <div className="md:col-span-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            RACECE checklist
          </h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {RACECE_LABELS.map(([key, label]) => {
              const ok = Boolean(feedback.racece_checklist?.[key]);
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs"
                >
                  {ok ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  {label}
                </div>
              );
            })}
          </div>
        </div>
        {feedback.teacher_note && (
          <p className="md:col-span-2 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm italic text-foreground">
            “{feedback.teacher_note}”
          </p>
        )}
      </div>
    </motion.div>
  );
}
