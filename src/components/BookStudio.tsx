import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Loader2, Sparkles, Trash2, XCircle } from "lucide-react";
import { lazy, Suspense, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { CANCELLED, I18nError, isCancelled, useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { celebrate } from "@/lib/confetti";
import { detectLevelUp, type LevelUpInfo } from "@/lib/gamification";
import { gradeBookReport } from "@/lib/grading.functions";
import { LevelUpCelebration } from "@/components/LevelUpCelebration";

// Keep react-pdf / pdfjs-dist out of the Netlify SSR module graph.
const PdfReader = lazy(() =>
  import("@/components/PdfReader").then((m) => ({ default: m.PdfReader })),
);

export const BOOKS_BUCKET = "assigned-books";

export type AssignedBook = {
  id: string;
  title: string;
  author: string | null;
  pdf_url: string | null;
  prompt: string | null;
  assigned_by: string | null;
  student_may_delete: boolean;
};

type Feedback = {
  score: number;
  strengths: string;
  improvements: string;
  racece_checklist: Record<string, boolean>;
  teacher_note: string;
};

const RACECE_KEYS = ["restate", "answer", "cite_1", "explain_1", "cite_2", "explain_2"] as const;

export async function removeAssignedBook(book: AssignedBook) {
  // Permission-checked RPC: deletes the row or raises a real error.
  // Direct .delete() returned HTTP 204 with 0 rows when RLS denied — which
  // previously showed a false "Book removed" toast while the book stayed.
  const { data, error } = await supabase.rpc("delete_assigned_book", {
    _book_id: book.id,
  });
  if (error) throw error;
  const removed = data as { id?: string; pdf_url?: string | null } | null;
  if (!removed?.id) {
    throw new I18nError("book.removeDenied");
  }

  const path = removed.pdf_url ?? book.pdf_url;
  if (path && !path.startsWith("http")) {
    // Best-effort: row is already gone. Storage RLS can no-op without error.
    const { error: storageError } = await supabase.storage
      .from(BOOKS_BUCKET)
      .remove([path]);
    if (storageError) {
      console.warn("[assigned-books] PDF cleanup failed:", storageError.message);
    }
  }
}

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
  const { t, tError, formatNumber } = useTranslation();
  const chapterId = useId();
  const reportId = useId();
  const { data: books, isLoading, isError } = useBooks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chapter, setChapter] = useState("");
  const [reportText, setReportText] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);

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
        .from(BOOKS_BUCKET)
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
      toast.success(t("book.gradedToast", { xp: formatNumber(result.xpAwarded) }));
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["book_reports"] });
      if (typeof result.newXp === "number" && result.xpAwarded > 0) {
        const previousXp = result.newXp - result.xpAwarded;
        const up = detectLevelUp(previousXp, result.xpAwarded);
        if (up) setLevelUp(up);
      }
    },
    onError: (err: Error) => toast.error(tError(err, "book.gradeFailed")),
  });

  const removeBook = useMutation({
    mutationFn: async (book: AssignedBook) => {
      if (!book.student_may_delete) {
        throw new I18nError("book.removeNotAllowed");
      }
      if (!window.confirm(t("book.confirmRemoveStudent", { title: book.title }))) {
        throw new Error(CANCELLED);
      }
      await removeAssignedBook(book);
    },
    onSuccess: () => {
      toast.success(t("book.removed"));
      setSelectedId(null);
      setFeedback(null);
      queryClient.invalidateQueries({ queryKey: ["assigned_books"] });
    },
    onError: (err: Error) => {
      if (isCancelled(err)) return;
      toast.error(tError(err, "book.removeFailed"));
    },
  });

  return (
    <div className="space-y-4">
      <LevelUpCelebration info={levelUp} onClose={() => setLevelUp(null)} />
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {t("book.loadingLibrary")}
        </div>
      )}
      {isError && (
        <div className="surface-card p-6 text-sm text-destructive" role="alert">
          {t("book.libraryError")}
        </div>
      )}

      {books && books.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          role="listbox"
          aria-label={t("a11y.bookListAria")}
        >
          {books.map((book) => (
            <button
              key={book.id}
              type="button"
              role="option"
              aria-selected={selected?.id === book.id}
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
            <BookOpen className="size-4 text-reading" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {selected?.title ?? t("book.noBookSelected")}
              </p>
              {selected?.author && (
                <p className="truncate text-xs text-muted-foreground">
                  {t("book.byAuthor", { author: selected.author })}
                </p>
              )}
            </div>
            {selected?.student_may_delete && (
              <button
                type="button"
                onClick={() => removeBook.mutate(selected)}
                disabled={removeBook.isPending}
                className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                aria-label={t("book.removeAria", { title: selected.title })}
                title={t("book.removeTitle")}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </div>
          {signedUrl ? (
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> {t("pdf.loadingReader")}
                </div>
              }
            >
              <PdfReader url={signedUrl} title={selected?.title ?? t("book.defaultBookTitle")} />
            </Suspense>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {selected ? t("book.noPdfAttached") : t("book.noBooksYet")}
            </div>
          )}
          {selected?.prompt && (
            <div className="border-t border-border bg-background/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">{t("book.readingPromptPrefix")}</span>
              {selected.prompt}
            </div>
          )}
        </div>

        {/* Report form */}
        <div className="surface-card flex flex-col gap-3 p-4">
          <div>
            <label
              htmlFor={chapterId}
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("book.chapterLabel")}
            </label>
            <input
              id={chapterId}
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder={t("book.chapterPlaceholder")}
              className="input-base mt-1"
            />
          </div>
          <div className="flex flex-1 flex-col">
            <label
              htmlFor={reportId}
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("book.reportLabel")}
            </label>
            <textarea
              id={reportId}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={12}
              placeholder={t("book.reportPlaceholder")}
              className="input-base mt-1 min-h-48 w-full flex-1 resize-y leading-relaxed"
            />
            <p className="mt-1 text-end text-[11px] text-muted-foreground" aria-live="polite">
              {t("book.wordCount", {
                count: reportText.trim().split(/\s+/).filter(Boolean).length,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => grade.mutate()}
            disabled={grade.isPending || reportText.trim().length < 40}
            className="glow-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {grade.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> {t("book.grading")}
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden /> {t("book.submit")}
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
  const { t, formatNumber } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card overflow-hidden"
      role="region"
      aria-label={t("a11y.feedbackLive")}
      aria-live="polite"
    >
      <div className="hero-gradient flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-primary" aria-hidden /> {t("book.feedback.title")}
        </div>
        <div className="text-2xl font-black text-xp">
          {t("book.feedback.score", { score: formatNumber(feedback.score) })}
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-success">
            {t("book.feedback.strengths")}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feedback.strengths}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ela">
            {t("book.feedback.improvements")}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {feedback.improvements}
          </p>
        </div>
        <div className="md:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("book.feedback.checklistTitle")}
          </h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {RACECE_KEYS.map((key) => {
              const ok = Boolean(feedback.racece_checklist?.[key]);
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs"
                >
                  {ok ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
                  )}
                  <span>
                    {t(`book.feedback.racece.${key}`)}
                    <span className="sr-only">
                      {ok ? t("a11y.choiceCorrect") : t("a11y.choiceIncorrect")}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
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
