import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookUp, FileUp, Link2, Loader2, Plus, RefreshCw, Trash2, Unlink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CANCELLED, I18nError, isCancelled, useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { CURRICULUM_UNIT_TAGS } from "@/lib/curriculum";
import {
  discardLessonDraft,
  generateLessonDraftFromPdf,
  publishLessonDraft,
  rematchLessonVideos,
} from "@/lib/lesson-draft.functions";
import { parseLessonPayload, type LessonPayload } from "@/lib/lesson-payload";
import { MASTERY_SCORE_MIN } from "@/lib/task-progress";
import { FeedbackCard, removeAssignedBook, useBooks, type AssignedBook } from "./BookStudio";
import { HowToContextual } from "@/components/howto/HowToContextual";
import { resolveTaskLesson, useTasks, type Task } from "./TaskBoard";

const BOOKS_BUCKET = "assigned-books";
const LESSON_WORKSHEETS_BUCKET = "lesson-worksheets";
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB — matches storage.buckets.file_size_limit

function isPdfFile(file: File) {
  const nameOk = file.name.toLowerCase().endsWith(".pdf");
  const typeOk =
    !file.type ||
    file.type === "application/pdf" ||
    file.type === "application/x-pdf";
  return nameOk && typeOk;
}

type Subject = { id: string; title: string };

type LinkedStudent = {
  id: string;
  display_name: string | null;
  xp_points: number;
  level: number;
  streak_days: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingLinksSchema(message: string | undefined) {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("parent_student_links") ||
    m.includes("link_student_by_code") ||
    m.includes("link_code") ||
    m.includes("could not find the function") ||
    m.includes("schema cache")
  );
}

export function ParentPortal({
  userId,
  subjects,
  howtoEnabled = true,
}: {
  userId: string;
  subjects: Subject[];
  howtoEnabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <HowToContextual
        userId={userId}
        shortId="parent-welcome"
        enabled={howtoEnabled}
      />
      <WorksheetLessonUploader
        userId={userId}
        subjects={subjects}
        howtoEnabled={howtoEnabled}
      />
      <BookUploader userId={userId} howtoEnabled={howtoEnabled} />
      <TaskCreator userId={userId} subjects={subjects} howtoEnabled={howtoEnabled} />
      <ProgressMonitor
        parentId={userId}
        subjects={subjects}
        howtoEnabled={howtoEnabled}
      />
    </div>
  );
}

function WorksheetLessonUploader({
  userId,
  subjects,
  howtoEnabled = true,
}: {
  userId: string;
  subjects: Subject[];
  howtoEnabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateLessonDraftFromPdf);
  const publishFn = useServerFn(publishLessonDraft);
  const discardFn = useServerFn(discardLessonDraft);
  const { data: tasks } = useTasks();
  const { t, tDb, tError, formatNumber } = useTranslation();

  const [subjectId, setSubjectId] = useState("");
  const [titleHint, setTitleHint] = useState("");
  const [sourceCredit, setSourceCredit] = useState(
    t("parent.worksheetUploader.sourceCreditDefault"),
  );
  const [file, setFile] = useState<File | null>(null);
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCredit, setEditCredit] = useState("");

  const drafts = useMemo(
    () =>
      (tasks ?? []).filter(
        (t) => t.is_draft && t.created_by === userId && Boolean(t.lesson_payload),
      ),
    [tasks, userId],
  );

  const reviewTask = drafts.find((t) => t.id === reviewTaskId) ?? drafts[0] ?? null;
  const reviewPayload: LessonPayload | null = reviewTask
    ? parseLessonPayload(reviewTask.lesson_payload)
    : null;

  useEffect(() => {
    if (!reviewTask) {
      setReviewTaskId(null);
      return;
    }
    setReviewTaskId(reviewTask.id);
    setEditTitle(reviewTask.title);
    setEditDescription(reviewTask.description ?? "");
    const payload = parseLessonPayload(reviewTask.lesson_payload);
    setEditCredit(reviewTask.source_credit ?? payload?.sourceCredit ?? "");
  }, [reviewTask?.id, reviewTask?.title, reviewTask?.description, reviewTask?.source_credit, reviewTask?.lesson_payload]);

  const generate = useMutation({
    mutationFn: async () => {
      if (!file) throw new I18nError("parent.worksheetUploader.choosePdfError");
      if (!isPdfFile(file)) throw new I18nError("parent.worksheetUploader.pdfOnlyError");
      if (file.size > MAX_PDF_BYTES) {
        throw new I18nError("parent.worksheetUploader.pdfTooLargeError");
      }
      const sid = subjectId || subjects[0]?.id;
      if (!sid) throw new I18nError("parent.worksheetUploader.chooseSubjectError");

      const key = `${userId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(LESSON_WORKSHEETS_BUCKET)
        .upload(key, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        const msg = uploadError.message;
        if (msg && /bucket not found/i.test(msg)) {
          throw new I18nError("parent.worksheetUploader.missingWorksheetBucket");
        }
        throw msg ? new Error(msg) : new I18nError("parent.worksheetUploader.uploadFailed");
      }

      const subjectTitle = subjects.find((s) => s.id === sid)?.title ?? "";
      return generateFn({
        data: {
          storagePath: key,
          subjectId: sid,
          titleHint: titleHint || undefined,
          sourceCredit: sourceCredit || undefined,
          subjectHint: subjectTitle,
          xpReward: 100,
        },
      });
    },
    onSuccess: (result) => {
      toast.success(t("parent.worksheetUploader.draftReady"));
      setFile(null);
      setTitleHint("");
      setReviewTaskId(result.task.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(tError(err, "parent.worksheetUploader.draftFailed")),
  });

  const publish = useMutation({
    mutationFn: async (taskId: string) =>
      publishFn({
        data: {
          taskId,
          title: editTitle.trim() || undefined,
          description: editDescription.trim() || null,
          sourceCredit: editCredit.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(t("parent.worksheetUploader.published"));
      setReviewTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(tError(err, "parent.worksheetUploader.publishFailed")),
  });

  const discard = useMutation({
    mutationFn: async (taskId: string) => {
      if (!window.confirm(t("parent.worksheetUploader.confirmDiscard"))) {
        throw new Error(CANCELLED);
      }
      return discardFn({ data: { taskId } });
    },
    onSuccess: () => {
      toast.success(t("parent.worksheetUploader.discarded"));
      setReviewTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => {
      if (isCancelled(err)) return;
      toast.error(tError(err, "parent.worksheetUploader.discardFailed"));
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <HowToContextual
        userId={userId}
        shortId="parent-worksheet"
        enabled={howtoEnabled}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          generate.mutate();
        }}
        className="surface-card space-y-3 p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <FileUp className="size-4 text-primary" /> {t("parent.worksheetUploader.title")}
        </h3>
        <p className="text-xs text-muted-foreground">{t("parent.worksheetUploader.body")}</p>
        <Field label={t("parent.field.subject")}>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="input-base"
            required
          >
            <option value="">{t("parent.field.chooseSubject")}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {tDb("subjects.title", s.title)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("parent.worksheetUploader.titleHintLabel")}>
          <input
            className="input-base"
            value={titleHint}
            onChange={(e) => setTitleHint(e.target.value)}
            placeholder={t("parent.worksheetUploader.titleHintPlaceholder")}
          />
        </Field>
        <Field label={t("parent.worksheetUploader.sourceCreditLabel")}>
          <input
            className="input-base"
            value={sourceCredit}
            onChange={(e) => setSourceCredit(e.target.value)}
            placeholder={t("parent.worksheetUploader.sourceCreditPlaceholder")}
          />
        </Field>
        <Field label={t("parent.worksheetUploader.fileLabel")}>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              if (next && !isPdfFile(next)) {
                toast.error(t("parent.worksheetUploader.pdfOnlyError"));
                e.target.value = "";
                setFile(null);
                return;
              }
              if (next && next.size > MAX_PDF_BYTES) {
                toast.error(t("parent.worksheetUploader.pdfTooLargeError"));
                e.target.value = "";
                setFile(null);
                return;
              }
              setFile(next);
            }}
            className="input-base file:me-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary-foreground"
            required
          />
        </Field>
        <button
          type="submit"
          disabled={generate.isPending || !file}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {generate.isPending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> {t("parent.worksheetUploader.drafting")}
            </span>
          ) : (
            t("parent.worksheetUploader.submit")
          )}
        </button>
      </form>

      <div className="surface-card space-y-3 p-5">
        <h3 className="text-sm font-bold">{t("parent.worksheetUploader.reviewTitle")}</h3>
        {drafts.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("parent.worksheetUploader.noDrafts")}</p>
        )}
        {drafts.length > 1 && (
          <Field label={t("parent.field.draft")}>
            <select
              className="input-base"
              value={reviewTask?.id ?? ""}
              onChange={(e) => setReviewTaskId(e.target.value)}
            >
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        {reviewTask && reviewPayload && (
          <div className="space-y-3">
            <Field label={t("parent.field.title")}>
              <input
                className="input-base"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </Field>
            <Field label={t("parent.field.description")}>
              <textarea
                className="input-base min-h-16"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </Field>
            <Field label={t("parent.field.sourceCredit")}>
              <input
                className="input-base"
                value={editCredit}
                onChange={(e) => setEditCredit(e.target.value)}
              />
            </Field>
            <div className="rounded-lg border border-border bg-background/50 p-3 text-xs">
              <p className="font-semibold">{reviewPayload.title}</p>
              <p className="mt-1 text-muted-foreground">
                {t("parent.worksheetUploader.draftSummary", {
                  questions: formatNumber(reviewPayload.questions.length),
                  fields: formatNumber(reviewPayload.worksheet?.fields.length ?? 0),
                  pass: formatNumber(reviewPayload.passPercent),
                })}
              </p>
              {reviewPayload.youtubeVideoId ? (
                <p className="mt-2 text-muted-foreground">
                  {t("parent.worksheetUploader.videoLine", {
                    title: reviewPayload.youtubeTitle ?? reviewPayload.youtubeVideoId,
                  })}
                  {reviewPayload.youtubeChannel ? ` · ${reviewPayload.youtubeChannel}` : ""}
                </p>
              ) : (
                <p className="mt-2 text-amber-700 dark:text-amber-300">
                  {t("parent.worksheetUploader.noVideoMatch")}
                </p>
              )}
              {reviewPayload.transcript ? (
                <p className="mt-1 text-muted-foreground">
                  {t("parent.worksheetUploader.transcriptReady", {
                    chars: formatNumber(reviewPayload.transcript.length),
                  })}
                </p>
              ) : null}
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                {reviewPayload.questions.map((q) => (
                  <li key={q.id}>{q.prompt}</li>
                ))}
              </ul>
              {reviewPayload.worksheet?.fields?.length ? (
                <>
                  <p className="mt-3 font-semibold">
                    {t("parent.worksheetUploader.fillableTitle")}
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                    {reviewPayload.worksheet.fields.map((f) => (
                      <li key={f.id}>
                        [{f.type}] {f.prompt}
                        {f.gradingHint ? (
                          <span className="block ps-4 text-[11px] text-muted-foreground/80">
                            {t("parent.worksheetUploader.answerKeyPrefix")}
                            {f.gradingHint.slice(0, 160)}
                            {f.gradingHint.length > 160 ? "…" : ""}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={publish.isPending}
                onClick={() => publish.mutate(reviewTask.id)}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {publish.isPending ? t("common.publishing") : t("common.publish")}
              </button>
              <button
                type="button"
                disabled={discard.isPending}
                onClick={() => discard.mutate(reviewTask.id)}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-60"
              >
                {t("common.discard")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCreator({
  userId,
  subjects,
  howtoEnabled = true,
}: {
  userId: string;
  subjects: Subject[];
  howtoEnabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { t, tDb, tError } = useTranslation();
  const [form, setForm] = useState({
    subject_id: "",
    title: "",
    description: "",
    unit_tag: "",
    xp_reward: 100,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        subject_id: form.subject_id || subjects[0]?.id,
        title: form.title,
        description: form.description || null,
        unit_tag: form.unit_tag || null,
        xp_reward: Number(form.xp_reward) || 100,
        created_by: userId,
        is_draft: false,
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("parent.taskCreator.assigned"));
      setForm({ subject_id: form.subject_id, title: "", description: "", unit_tag: "", xp_reward: 100 });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(tError(err, "parent.taskCreator.assignFailed")),
  });

  return (
    <>
      <HowToContextual
        userId={userId}
        shortId="parent-tasks-books"
        enabled={howtoEnabled}
      />
      <details className="surface-card group overflow-hidden">
        <summary className="cursor-pointer list-none p-5 marker:content-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Plus className="size-4 shrink-0 text-muted-foreground" />
                {t("parent.taskCreator.title")}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("parent.taskCreator.bodyBefore")}{" "}
                <span className="font-medium text-foreground/80">
                  {t("parent.taskCreator.bodyLink")}
                </span>{" "}
                {t("parent.taskCreator.bodyAfter")}
              </p>
            </div>
            <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground group-open:hidden">
              {t("common.show")}
            </span>
            <span className="mt-0.5 hidden shrink-0 text-xs font-semibold text-muted-foreground group-open:inline">
              {t("common.hide")}
            </span>
          </div>
        </summary>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-3 border-t border-border px-5 pb-5 pt-4"
        >
          <Field label={t("parent.field.subject")}>
            <select
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              className="input-base"
              required
            >
              <option value="">{t("parent.field.chooseSubject")}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {tDb("subjects.title", s.title)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("parent.taskCreator.taskTitleLabel")}>
            <input
              className="input-base"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("parent.taskCreator.taskTitlePlaceholder")}
              required
            />
          </Field>
          <Field label={t("parent.field.description")}>
            <textarea
              className="input-base min-h-20"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("parent.taskCreator.descriptionPlaceholder")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("parent.taskCreator.unitTagLabel")}>
              <input
                className="input-base"
                value={form.unit_tag}
                onChange={(e) => setForm({ ...form, unit_tag: e.target.value })}
                placeholder={t("parent.taskCreator.unitTagPlaceholder")}
                list="hudson-cliffs-unit-tags"
                required
              />
              <datalist id="hudson-cliffs-unit-tags">
                {CURRICULUM_UNIT_TAGS.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </Field>
            <Field label={t("parent.taskCreator.xpRewardLabel")}>
              <input
                type="number"
                min={10}
                step={10}
                className="input-base"
                value={form.xp_reward}
                onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })}
              />
            </Field>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("parent.taskCreator.tagsNote", { tags: CURRICULUM_UNIT_TAGS.join(", ") })}
          </p>
          <button
            type="submit"
            disabled={create.isPending}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold transition hover:bg-secondary disabled:opacity-60"
          >
            {create.isPending ? t("parent.taskCreator.assigning") : t("parent.taskCreator.submit")}
          </button>
        </form>
      </details>
    </>
  );
}

function BookUploader({
  userId,
  howtoEnabled = true,
}: {
  userId: string;
  howtoEnabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: books } = useBooks();
  const { t, tError } = useTranslation();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [allowStudentDelete, setAllowStudentDelete] = useState(false);

  const myBooks = useMemo(
    () => (books ?? []).filter((b) => b.assigned_by === userId),
    [books, userId],
  );

  const upload = useMutation({
    mutationFn: async () => {
      let path: string | null = null;
      if (file) {
        if (!isPdfFile(file)) {
          throw new I18nError("parent.worksheetUploader.pdfOnlyError");
        }
        if (file.size > MAX_PDF_BYTES) {
          throw new I18nError("parent.worksheetUploader.pdfTooLargeError");
        }
        // Path: {uploader_user_id}/{uuid}.pdf — RLS scopes by folder prefix
        const key = `${userId}/${crypto.randomUUID()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from(BOOKS_BUCKET)
          .upload(key, file, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (uploadError) {
          const msg = uploadError.message;
          if (msg && /bucket not found/i.test(msg)) {
            throw new I18nError("parent.bookUploader.missingBooksBucket");
          }
          throw msg ? new Error(msg) : new I18nError("parent.worksheetUploader.uploadFailed");
        }
        path = key;
      }
      const { error } = await supabase.from("assigned_books").insert({
        title,
        author: author || null,
        pdf_url: path,
        prompt: prompt || null,
        assigned_by: userId,
        student_may_delete: allowStudentDelete,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("parent.bookUploader.assigned"));
      void trackEvent("book_assign");
      setTitle("");
      setAuthor("");
      setPrompt("");
      setFile(null);
      setAllowStudentDelete(false);
      queryClient.invalidateQueries({ queryKey: ["assigned_books"] });
    },
    onError: (err: Error) => toast.error(tError(err, "parent.worksheetUploader.uploadFailed")),
  });

  const toggleStudentDelete = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { data, error } = await supabase
        .from("assigned_books")
        .update({ student_may_delete: value })
        .eq("id", id)
        .eq("assigned_by", userId)
        .select("id");
      if (error) throw error;
      if (!data?.length) {
        throw new I18nError("parent.bookUploader.permissionUpdateDenied");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assigned_books"] });
    },
    onError: (err: Error) => toast.error(tError(err, "parent.bookUploader.permissionUpdateFailed")),
  });

  const removeBook = useMutation({
    mutationFn: async (book: AssignedBook) => {
      if (!window.confirm(t("parent.bookUploader.confirmRemove", { title: book.title }))) {
        throw new Error(CANCELLED);
      }
      await removeAssignedBook(book);
    },
    onSuccess: () => {
      toast.success(t("book.removed"));
      queryClient.invalidateQueries({ queryKey: ["assigned_books"] });
    },
    onError: (err: Error) => {
      if (isCancelled(err)) return;
      toast.error(tError(err, "book.removeFailed"));
    },
  });

  return (
    <div className="space-y-3">
      <HowToContextual
        userId={userId}
        shortId="parent-tasks-books"
        enabled={howtoEnabled}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
        className="surface-card space-y-3 p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <BookUp className="size-4 text-reading" /> {t("parent.bookUploader.title")}
        </h3>
        <Field label={t("parent.bookUploader.bookTitleLabel")}>
          <input
            className="input-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        <Field label={t("parent.bookUploader.authorLabel")}>
          <input className="input-base" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <Field label={t("parent.bookUploader.promptLabel")}>
          <textarea
            className="input-base min-h-20"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("parent.bookUploader.promptPlaceholder")}
          />
        </Field>
        <Field label={t("parent.bookUploader.fileLabel")}>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              if (next && !isPdfFile(next)) {
                toast.error(t("parent.worksheetUploader.pdfOnlyError"));
                e.target.value = "";
                setFile(null);
                return;
              }
              if (next && next.size > MAX_PDF_BYTES) {
                toast.error(t("parent.worksheetUploader.pdfTooLargeError"));
                e.target.value = "";
                setFile(null);
                return;
              }
              setFile(next);
            }}
            className="input-base file:me-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary-foreground"
            required
          />
        </Field>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={allowStudentDelete}
            onChange={(e) => setAllowStudentDelete(e.target.checked)}
          />
          <span>{t("parent.bookUploader.allowStudentDelete")}</span>
        </label>
        <button
          type="submit"
          disabled={upload.isPending || !file}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {upload.isPending ? t("parent.bookUploader.uploading") : t("parent.bookUploader.submit")}
        </button>
      </form>

      {myBooks.length > 0 && (
        <div className="surface-card space-y-3 p-5">
          <h3 className="text-sm font-bold">{t("parent.bookUploader.assignedBooksTitle")}</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto pe-1">
            {myBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{book.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {book.author ?? t("book.unknownAuthor")}
                    {book.pdf_url
                      ? t("parent.bookUploader.pdfAttached")
                      : t("parent.bookUploader.noPdf")}
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={book.student_may_delete}
                      disabled={toggleStudentDelete.isPending}
                      onChange={(e) =>
                        toggleStudentDelete.mutate({
                          id: book.id,
                          value: e.target.checked,
                        })
                      }
                    />
                    {t("parent.bookUploader.allowStudentRemove")}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeBook.mutate(book)}
                  disabled={removeBook.isPending}
                  className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                  aria-label={t("parent.bookUploader.deleteAria", { title: book.title })}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressMonitor({
  parentId,
  subjects,
  howtoEnabled = true,
}: {
  parentId: string;
  subjects: Subject[];
  howtoEnabled?: boolean;
}) {
  const { data: tasks } = useTasks();
  const queryClient = useQueryClient();
  const rematchFn = useServerFn(rematchLessonVideos);
  const { t, tDb, tError, formatNumber, formatDateTime } = useTranslation();
  const [linkCode, setLinkCode] = useState("");
  const [selectedId, setSelectedId] = useState<string | "all">("all");
  const [schemaMissing, setSchemaMissing] = useState(false);

  const {
    data: students,
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ["linked-students", parentId],
    queryFn: async (): Promise<LinkedStudent[]> => {
      const { data: links, error: linksError } = await supabase
        .from("parent_student_links")
        .select("student_id")
        .eq("parent_id", parentId);

      if (linksError) {
        if (isMissingLinksSchema(linksError.message)) {
          setSchemaMissing(true);
          return [];
        }
        throw linksError;
      }
      setSchemaMissing(false);

      const ids = (links ?? []).map((l) => l.student_id);
      if (ids.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, xp_points, level, streak_days")
        .in("id", ids);

      if (profilesError) throw profilesError;
      return (profiles ?? []) as LinkedStudent[];
    },
  });

  useEffect(() => {
    if (!students?.length) {
      setSelectedId("all");
      return;
    }
    if (selectedId !== "all" && !students.some((s) => s.id === selectedId)) {
      setSelectedId(students[0].id);
    }
  }, [students, selectedId]);

  const focusIds = useMemo(() => {
    if (!students?.length) return [] as string[];
    if (selectedId === "all") return students.map((s) => s.id);
    return [selectedId];
  }, [students, selectedId]);

  const {
    data: progress,
    isLoading: progressLoading,
    error: progressError,
  } = useQuery({
    queryKey: ["task_progress_linked", focusIds],
    enabled: focusIds.length > 0,
    queryFn: async () => {
      const { fetchTaskProgressForStudents } = await import("@/lib/task-progress");
      return fetchTaskProgressForStudents(focusIds);
    },
  });

  const { data: studyActivity } = useQuery({
    queryKey: ["daily_activity_linked", focusIds],
    enabled: focusIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_activity")
        .select("user_id, task_id, seconds_spent, best_score, activity_date")
        .in("user_id", focusIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["book_reports_linked", focusIds],
    enabled: focusIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_reports")
        .select("*")
        .in("student_id", focusIds)
        .order("submitted_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const linkStudent = useMutation({
    mutationFn: async (code: string) => {
      const trimmed = code.trim();
      if (!UUID_RE.test(trimmed)) {
        throw new I18nError("parent.progress.linkCodeInvalid");
      }
      const { data, error } = await supabase.rpc("link_student_by_code", { _code: trimmed });
      if (error) {
        if (isMissingLinksSchema(error.message)) {
          setSchemaMissing(true);
          throw new I18nError("parent.progress.linkSchemaMissing");
        }
        throw error;
      }
      return data as string;
    },
    onSuccess: () => {
      toast.success(t("parent.progress.studentLinked"));
      setLinkCode("");
      queryClient.invalidateQueries({ queryKey: ["linked-students", parentId] });
    },
    onError: (err: Error) => toast.error(tError(err, "parent.progress.linkFailed")),
  });

  const unlinkStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("parent_student_links")
        .delete()
        .eq("parent_id", parentId)
        .eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("parent.progress.studentUnlinked"));
      queryClient.invalidateQueries({ queryKey: ["linked-students", parentId] });
    },
    onError: (err: Error) => toast.error(tError(err, "common.somethingWentWrong")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("delete_task", { _task_id: id });
      if (error) throw error;
      const removed = data as { id?: string } | null;
      if (!removed?.id) {
        throw new I18nError("parent.progress.taskRemoveDenied");
      }
    },
    onSuccess: () => {
      toast.success(t("parent.progress.taskRemoved"));
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(tError(err, "parent.progress.taskRemoveFailed")),
  });

  const rematchVideos = useMutation({
    mutationFn: async () => rematchFn({ data: {} }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const updated = result?.updated ?? 0;
      const scanned = result?.scanned ?? 0;
      if (updated === 0) {
        toast.success(
          scanned
            ? t("parent.progress.videosAlreadyRight", { count: scanned })
            : t("parent.progress.noWorksheetLessons"),
        );
        return;
      }
      toast.success(
        t("parent.progress.videosUpdated", {
          count: scanned,
          updated: formatNumber(updated),
          scanned: formatNumber(scanned),
        }),
      );
    },
    onError: (err: Error) => toast.error(tError(err, "parent.progress.videosRefreshFailed")),
  });

  const worksheetLessonCount = (tasks ?? []).filter(
    (t: Task) => t.created_by === parentId && Boolean(t.lesson_payload),
  ).length;
  const masteredIds = new Set(
    (progress ?? [])
      .filter((p) => p.score >= MASTERY_SCORE_MIN)
      .map((p) => p.task_id),
  );

  const bySubject = subjects.map((s) => {
    // Quizzable curriculum lessons + published payload lessons count toward mastery %
    const list = (tasks ?? []).filter(
      (t: Task) =>
        t.subject_id === s.id &&
        !t.is_draft &&
        Boolean(resolveTaskLesson(t)),
    );
    const done = list.filter((t) => masteredIds.has(t.id)).length;
    return {
      ...s,
      total: list.length,
      done,
      pct: list.length ? Math.round((done / list.length) * 100) : 0,
    };
  });

  const totalStudySeconds = (studyActivity ?? []).reduce(
    (sum, row) => sum + (row.seconds_spent ?? 0),
    0,
  );
  const studyMinutes = Math.round(totalStudySeconds / 60);
  const scoredAttempts = (progress ?? []).reduce(
    (sum, row) => sum + Math.max(0, row.attempt_count ?? (row.score != null ? 1 : 0)),
    0,
  );
  const quizAttempts = (studyActivity ?? []).filter(
    (row) => row.best_score != null,
  ).length;
  const attemptDisplay = scoredAttempts > 0 ? scoredAttempts : quizAttempts;
  const masteredCount = masteredIds.size;
  const hasMasteryData = masteredCount > 0;

  const hasLinks = (students?.length ?? 0) > 0;
  const loadError =
    studentsError instanceof Error
      ? studentsError.message
      : studentsError
        ? String(studentsError)
        : null;
  const progressLoadError =
    progressError instanceof Error
      ? progressError.message
      : progressError
        ? String(progressError)
        : null;

  return (
    <div className="space-y-4">
      <HowToContextual
        userId={parentId}
        shortId="parent-link-student"
        enabled={howtoEnabled}
      />
      <HowToContextual
        userId={parentId}
        shortId="parent-progress"
        enabled={howtoEnabled && Boolean(students?.length)}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          linkStudent.mutate(linkCode);
        }}
        className="surface-card space-y-3 p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Link2 className="size-4 text-primary" /> {t("parent.progress.linkTitle")}
        </h3>
        <p className="text-xs text-muted-foreground">{t("parent.progress.linkBody")}</p>
        <Field label={t("parent.progress.linkCodeLabel")}>
          <input
            className="input-base font-mono text-sm"
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value)}
            placeholder={t("parent.progress.linkCodePlaceholder")}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </Field>
        <button
          type="submit"
          disabled={linkStudent.isPending}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {linkStudent.isPending
            ? t("parent.progress.linking")
            : t("parent.progress.linkSubmit")}
        </button>
        {(schemaMissing || (loadError && isMissingLinksSchema(loadError))) && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {t("parent.progress.migrationRequiredBefore")}{" "}
            <code className="font-mono">supabase/migrations/*_parent_student_links.sql</code>{" "}
            {t("parent.progress.migrationRequiredAfter", { command: "supabase db push" })}
          </p>
        )}
      </form>

      {studentsLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("parent.progress.loadingStudents")}
        </p>
      )}

      {!studentsLoading && !hasLinks && !schemaMissing && (
        <div className="surface-card p-5 text-sm text-muted-foreground">
          {t("parent.progress.noStudentsBefore")}{" "}
          <strong>{t("parent.progress.noStudentsLinkCode")}</strong>{" "}
          {t("parent.progress.noStudentsAfter")}
        </div>
      )}

      {hasLinks && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("parent.progress.viewing")}
            </span>
            <select
              className="input-base max-w-xs text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value as string | "all")}
            >
              <option value="all">{t("parent.progress.allStudents")}</option>
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name ?? t("common.student")}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(students ?? []).map((s) => (
              <div
                key={s.id}
                className={`surface-card p-4 ${
                  selectedId === s.id ? "ring-2 ring-primary/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("common.student")}
                    </p>
                    <p className="text-sm font-bold">{s.display_name ?? t("common.student")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unlinkStudent.mutate(s.id)}
                    disabled={unlinkStudent.isPending}
                    className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                    aria-label={t("parent.progress.unlinkAria", {
                      name: s.display_name ?? t("common.student"),
                    })}
                    title={t("parent.progress.unlinkTitle")}
                  >
                    <Unlink className="size-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-2xl font-black text-xp">
                  {t("parent.progress.xpTotal", { xp: formatNumber(s.xp_points) })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("parent.progress.levelAndStreak", {
                    level: formatNumber(s.level),
                    days: formatNumber(s.streak_days),
                  })}
                </p>
              </div>
            ))}
          </div>

          <div className="surface-card p-5">
            <h3 className="text-sm font-bold">{t("parent.progress.masteryTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedId === "all"
                ? t("parent.progress.masteryBasisAll", {
                    pass: formatNumber(MASTERY_SCORE_MIN),
                  })
                : t("parent.progress.masteryBasisOne", {
                    pass: formatNumber(MASTERY_SCORE_MIN),
                  })}
            </p>
            {(studyMinutes > 0 || attemptDisplay > 0) && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("parent.progress.studyTimePrefix")}{" "}
                <span className="font-semibold text-foreground">
                  {t("parent.progress.studyMinutes", { minutes: formatNumber(studyMinutes) })}
                </span>
                {attemptDisplay > 0
                  ? t("parent.progress.quizAttempts", { count: attemptDisplay })
                  : t("parent.progress.noQuizYet")}
              </p>
            )}
            {progressLoading && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t("parent.progress.loadingMastery")}
              </p>
            )}
            {progressLoadError && (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {t("parent.progress.masteryLoadError", { message: progressLoadError })}
              </p>
            )}
            {!progressLoading && !progressLoadError && !hasMasteryData && (
              <p className="mt-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                {studyMinutes > 0
                  ? t("parent.progress.noMasteryOpened", {
                      pass: formatNumber(MASTERY_SCORE_MIN),
                    })
                  : t("parent.progress.noMasteryAtAll", {
                      pass: formatNumber(MASTERY_SCORE_MIN),
                    })}
              </p>
            )}
            <div className="mt-3 space-y-3">
              {bySubject.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{tDb("subjects.title", s.title)}</span>
                    <span>
                      {t("parent.progress.subjectProgress", {
                        done: formatNumber(s.done),
                        total: formatNumber(s.total),
                        pct: formatNumber(s.pct),
                      })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="xp-gradient h-full" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h3 className="text-sm font-bold">{t("parent.progress.manageTitle")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("parent.progress.manageBody")}</p>
            {worksheetLessonCount > 0 && (
              <button
                type="button"
                onClick={() => rematchVideos.mutate()}
                disabled={rematchVideos.isPending}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-secondary disabled:opacity-60"
              >
                {rematchVideos.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {t("parent.progress.fixVideos")}
              </button>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("parent.progress.fixVideosNote")}
            </p>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pe-1">
              {(tasks ?? [])
                .filter((item: Task) => !item.is_draft)
                .map((task: Task) => {
                const row = progress?.find((p) => p.task_id === task.id);
                const mastered = row && row.score >= MASTERY_SCORE_MIN;
                const attempts = row?.attempt_count ?? 0;
                const attempt = (studyActivity ?? [])
                  .filter((a) => a.task_id === task.id)
                  .sort((a, b) => (b.best_score ?? -1) - (a.best_score ?? -1))[0];
                const attemptsLabel = t("common.attempts", { count: attempts });
                const status = mastered
                  ? row!.score >= 100
                    ? t("parent.progress.status.perfect", {
                        score: formatNumber(row!.score),
                        attempts: attemptsLabel,
                      })
                    : t("parent.progress.status.mastered", {
                        score: formatNumber(row!.score),
                        attempts: attemptsLabel,
                      })
                  : row
                    ? t("parent.progress.status.best", {
                        score: formatNumber(row.score),
                        attempts: attemptsLabel,
                        pass: formatNumber(MASTERY_SCORE_MIN),
                      })
                    : attempt?.best_score != null
                      ? t("parent.progress.status.bestAttempt", {
                          score: formatNumber(attempt.best_score),
                          pass: formatNumber(MASTERY_SCORE_MIN),
                        })
                      : attempt && attempt.seconds_spent > 0
                        ? t("parent.progress.status.openedNotFinished")
                        : t("parent.progress.status.notMastered");
                const canRemove = task.created_by === parentId;
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {tDb("tasks.title", task.title)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("parent.progress.taskMeta", {
                          tag: task.unit_tag ?? t("common.none"),
                          xp: formatNumber(task.xp_reward),
                          status,
                        })}
                        {!canRemove ? t("parent.progress.curriculumSuffix") : ""}
                        {task.lesson_payload ? t("parent.progress.worksheetSuffix") : ""}
                      </p>
                    </div>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => remove.mutate(task.id)}
                        disabled={remove.isPending}
                        className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                        aria-label={t("parent.progress.deleteTaskAria", { title: task.title })}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold">{t("parent.progress.reportsTitle")}</h3>
            {reportsLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t("parent.progress.loadingReports")}
              </p>
            )}
            {!reportsLoading && reports?.length === 0 && (
              <p className="surface-card p-5 text-sm text-muted-foreground">
                {t("parent.progress.noReports")}
              </p>
            )}
            {(reports ?? []).map((r) => (
              <details key={r.id} className="surface-card p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  {r.chapter_or_topic} —{" "}
                  <span className="text-xp">
                    {r.ai_score ?? t("parent.progress.ungraded")}
                  </span>{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({formatDateTime(r.submitted_at)})
                  </span>
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="whitespace-pre-wrap rounded-lg border border-border bg-background/50 p-3 text-xs leading-relaxed text-muted-foreground">
                    {r.report_text}
                  </p>
                  {r.ai_feedback && (
                    <FeedbackCard
                      feedback={
                        r.ai_feedback as unknown as {
                          score: number;
                          strengths: string;
                          improvements: string;
                          racece_checklist: Record<string, boolean>;
                          teacher_note: string;
                        }
                      }
                    />
                  )}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
