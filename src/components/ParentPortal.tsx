import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookUp, FileUp, Link2, Loader2, Plus, Trash2, Unlink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { CURRICULUM_UNIT_TAGS } from "@/lib/curriculum";
import {
  discardLessonDraft,
  generateLessonDraftFromPdf,
  publishLessonDraft,
} from "@/lib/lesson-draft.functions";
import { parseLessonPayload, type LessonPayload } from "@/lib/lesson-payload";
import { FeedbackCard, removeAssignedBook, useBooks, type AssignedBook } from "./BookStudio";
import { resolveTaskLesson, useTasks, type Task } from "./TaskBoard";

const MASTERY_SCORE_MIN = 70;

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

export function ParentPortal({ userId, subjects }: { userId: string; subjects: Subject[] }) {
  return (
    <div className="space-y-4">
      <WorksheetLessonUploader userId={userId} subjects={subjects} />
      <div className="grid gap-4 lg:grid-cols-2">
        <TaskCreator userId={userId} subjects={subjects} />
        <BookUploader userId={userId} />
      </div>
      <ProgressMonitor parentId={userId} subjects={subjects} />
    </div>
  );
}

function WorksheetLessonUploader({
  userId,
  subjects,
}: {
  userId: string;
  subjects: Subject[];
}) {
  const queryClient = useQueryClient();
  const generateFn = useServerFn(generateLessonDraftFromPdf);
  const publishFn = useServerFn(publishLessonDraft);
  const discardFn = useServerFn(discardLessonDraft);
  const { data: tasks } = useTasks();

  const [subjectId, setSubjectId] = useState("");
  const [titleHint, setTitleHint] = useState("");
  const [sourceCredit, setSourceCredit] = useState("Worksheet uploaded by parent");
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
      if (!file) throw new Error("Choose a PDF first.");
      if (!isPdfFile(file)) throw new Error("Only PDF files are allowed.");
      if (file.size > MAX_PDF_BYTES) throw new Error("PDF must be 15 MB or smaller.");
      const sid = subjectId || subjects[0]?.id;
      if (!sid) throw new Error("Choose a subject.");

      const key = `${userId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(LESSON_WORKSHEETS_BUCKET)
        .upload(key, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        const msg = uploadError.message || "Upload failed.";
        if (/bucket not found/i.test(msg)) {
          throw new Error(
            "Storage bucket “lesson-worksheets” is missing. Ask an admin to run the lesson_drafts_from_pdf migration.",
          );
        }
        throw new Error(msg);
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
      toast.success("AI draft ready — review before publishing.");
      setFile(null);
      setTitleHint("");
      setReviewTaskId(result.task.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not draft lesson from PDF."),
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
      toast.success("Lesson published — students can practice it now.");
      setReviewTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not publish."),
  });

  const discard = useMutation({
    mutationFn: async (taskId: string) => {
      if (!window.confirm("Discard this draft and delete the uploaded PDF?")) {
        throw new Error("cancelled");
      }
      return discardFn({ data: { taskId } });
    },
    onSuccess: () => {
      toast.success("Draft discarded.");
      setReviewTaskId(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => {
      if (err.message === "cancelled") return;
      toast.error(err.message || "Could not discard draft.");
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          generate.mutate();
        }}
        className="surface-card space-y-3 p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <FileUp className="size-4 text-primary" /> Upload worksheet → AI lesson draft
        </h3>
        <p className="text-xs text-muted-foreground">
          Upload a PDF you are allowed to use. The AI drafts a lesson with 5 quiz questions and
          fillable on-site worksheet fields (students write their own answers; answer keys stay hidden for grading/coaching). The app also attaches a matching curriculum YouTube video + reading transcript when it finds a strong topic match. Students never see drafts until you publish. No
          scraping — upload only.
        </p>
        <Field label="Subject">
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="input-base"
            required
          >
            <option value="">Choose a subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title hint (optional)">
          <input
            className="input-base"
            value={titleHint}
            onChange={(e) => setTitleHint(e.target.value)}
            placeholder="Fractions practice — unlike denominators"
          />
        </Field>
        <Field label="Source credit (optional)">
          <input
            className="input-base"
            value={sourceCredit}
            onChange={(e) => setSourceCredit(e.target.value)}
            placeholder="Worksheet uploaded by parent"
          />
        </Field>
        <Field label="Worksheet PDF (required · max 15 MB · text-based)">
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              if (next && !isPdfFile(next)) {
                toast.error("Only PDF files are allowed.");
                e.target.value = "";
                setFile(null);
                return;
              }
              if (next && next.size > MAX_PDF_BYTES) {
                toast.error("PDF must be 15 MB or smaller.");
                e.target.value = "";
                setFile(null);
                return;
              }
              setFile(next);
            }}
            className="input-base file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary-foreground"
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
              <Loader2 className="size-4 animate-spin" /> Drafting with AI…
            </span>
          ) : (
            "Generate draft lesson"
          )}
        </button>
      </form>

      <div className="surface-card space-y-3 p-5">
        <h3 className="text-sm font-bold">Review drafts</h3>
        {drafts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No drafts yet. Upload a PDF to generate one.
          </p>
        )}
        {drafts.length > 1 && (
          <Field label="Draft">
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
            <Field label="Title">
              <input
                className="input-base"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </Field>
            <Field label="Description">
              <textarea
                className="input-base min-h-16"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </Field>
            <Field label="Source credit">
              <input
                className="input-base"
                value={editCredit}
                onChange={(e) => setEditCredit(e.target.value)}
              />
            </Field>
            <div className="rounded-lg border border-border bg-background/50 p-3 text-xs">
              <p className="font-semibold">{reviewPayload.title}</p>
              <p className="mt-1 text-muted-foreground">
                {reviewPayload.questions.length} quiz questions ·{" "}
                {reviewPayload.worksheet?.fields.length ?? 0} fillable fields · pass{" "}
                {reviewPayload.passPercent}%
              </p>
              {reviewPayload.youtubeVideoId ? (
                <p className="mt-2 text-muted-foreground">
                  Video: {reviewPayload.youtubeTitle ?? reviewPayload.youtubeVideoId}
                  {reviewPayload.youtubeChannel ? ` · ${reviewPayload.youtubeChannel}` : ""}
                </p>
              ) : (
                <p className="mt-2 text-amber-700 dark:text-amber-300">
                  No matching curriculum video found for this topic — students will still get reading
                  text.
                </p>
              )}
              {reviewPayload.transcript ? (
                <p className="mt-1 text-muted-foreground">
                  Transcript ready ({reviewPayload.transcript.length} chars)
                </p>
              ) : null}
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                {reviewPayload.questions.map((q) => (
                  <li key={q.id}>{q.prompt}</li>
                ))}
              </ul>
              {reviewPayload.worksheet?.fields?.length ? (
                <>
                  <p className="mt-3 font-semibold">Fillable worksheet (student blanks)</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                    {reviewPayload.worksheet.fields.map((f) => (
                      <li key={f.id}>
                        [{f.type}] {f.prompt}
                        {f.gradingHint ? (
                          <span className="block pl-4 text-[11px] text-muted-foreground/80">
                            Answer key (hidden from students): {f.gradingHint.slice(0, 160)}
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
                {publish.isPending ? "Publishing…" : "Publish"}
              </button>
              <button
                type="button"
                disabled={discard.isPending}
                onClick={() => discard.mutate(reviewTask.id)}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-60"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCreator({ userId, subjects }: { userId: string; subjects: Subject[] }) {
  const queryClient = useQueryClient();
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
      toast.success("Task published to the student portal.");
      setForm({ subject_id: form.subject_id, title: "", description: "", unit_tag: "", xp_reward: 100 });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not publish that task."),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
      className="surface-card space-y-3 p-5"
    >
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Plus className="size-4 text-primary" /> Curriculum Task Creator
      </h3>
      <Field label="Subject">
        <select
          value={form.subject_id}
          onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
          className="input-base"
          required
        >
          <option value="">Choose a subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Task title">
        <input
          className="input-base"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Fractions with unlike denominators — set B"
          required
        />
      </Field>
      <Field label="Description">
        <textarea
          className="input-base min-h-20"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What should the student do?"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="P.S. 187 unit tag">
          <input
            className="input-base"
            value={form.unit_tag}
            onChange={(e) => setForm({ ...form, unit_tag: e.target.value })}
            placeholder="187_MATH_FRACTIONS"
            list="hudson-cliffs-unit-tags"
          />
          <datalist id="hudson-cliffs-unit-tags">
            {CURRICULUM_UNIT_TAGS.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </Field>
        <Field label="XP reward">
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
        NYC Grade 5 / Hudson Cliffs unit tags (pick from the list):{" "}
        {CURRICULUM_UNIT_TAGS.join(", ")}.
      </p>
      <button
        type="submit"
        disabled={create.isPending}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
      >
        {create.isPending ? "Publishing…" : "Publish task"}
      </button>
    </form>
  );
}

function BookUploader({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data: books } = useBooks();
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
          throw new Error("Only PDF files are allowed.");
        }
        if (file.size > MAX_PDF_BYTES) {
          throw new Error("PDF must be 15 MB or smaller.");
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
          const msg = uploadError.message || "Upload failed.";
          if (/bucket not found/i.test(msg)) {
            throw new Error(
              "Storage bucket “assigned-books” is missing. Ask an admin to run the secure_assigned_books_storage migration.",
            );
          }
          throw new Error(msg);
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
      toast.success("Book assigned.");
      void trackEvent("book_assign");
      setTitle("");
      setAuthor("");
      setPrompt("");
      setFile(null);
      setAllowStudentDelete(false);
      queryClient.invalidateQueries({ queryKey: ["assigned_books"] });
    },
    onError: (err: Error) => toast.error(err.message || "Upload failed."),
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
        throw new Error("Could not update permission. You may not own this book.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assigned_books"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not update permission."),
  });

  const removeBook = useMutation({
    mutationFn: async (book: AssignedBook) => {
      if (
        !window.confirm(
          `Remove “${book.title}” permanently? The PDF will be deleted from storage.`,
        )
      ) {
        throw new Error("cancelled");
      }
      await removeAssignedBook(book);
    },
    onSuccess: () => {
      toast.success("Book removed.");
      queryClient.invalidateQueries({ queryKey: ["assigned_books"] });
    },
    onError: (err: Error) => {
      if (err.message === "cancelled") return;
      toast.error(err.message || "Could not remove book.");
    },
  });

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
        className="surface-card space-y-3 p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <BookUp className="size-4 text-reading" /> Book Upload Manager
        </h3>
        <Field label="Book title">
          <input
            className="input-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        <Field label="Author">
          <input className="input-base" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <Field label="Reading prompt">
          <textarea
            className="input-base min-h-20"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="How does the narrator change after the storm? Use RACECE."
          />
        </Field>
        <Field label="PDF file (required · max 15 MB)">
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              if (next && !isPdfFile(next)) {
                toast.error("Only PDF files are allowed.");
                e.target.value = "";
                setFile(null);
                return;
              }
              if (next && next.size > MAX_PDF_BYTES) {
                toast.error("PDF must be 15 MB or smaller.");
                e.target.value = "";
                setFile(null);
                return;
              }
              setFile(next);
            }}
            className="input-base file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary-foreground"
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
          <span>Allow student to remove this book once they are done</span>
        </label>
        <button
          type="submit"
          disabled={upload.isPending || !file}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {upload.isPending ? "Uploading…" : "Assign book"}
        </button>
      </form>

      {myBooks.length > 0 && (
        <div className="surface-card space-y-3 p-5">
          <h3 className="text-sm font-bold">Assigned books</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {myBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{book.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {book.author ?? "Unknown author"}
                    {book.pdf_url ? " · PDF attached" : " · no PDF"}
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
                    Allow student to remove
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeBook.mutate(book)}
                  disabled={removeBook.isPending}
                  className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`Delete ${book.title}`}
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

function ProgressMonitor({ parentId, subjects }: { parentId: string; subjects: Subject[] }) {
  const { data: tasks } = useTasks();
  const queryClient = useQueryClient();
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
        throw new Error("Enter a valid parent link code (UUID).");
      }
      const { data, error } = await supabase.rpc("link_student_by_code", { _code: trimmed });
      if (error) {
        if (isMissingLinksSchema(error.message)) {
          setSchemaMissing(true);
          throw new Error(
            "Parent–student linking is not set up yet. Run the parent_student_links migration in Supabase, then try again.",
          );
        }
        throw error;
      }
      return data as string;
    },
    onSuccess: () => {
      toast.success("Student linked.");
      setLinkCode("");
      queryClient.invalidateQueries({ queryKey: ["linked-students", parentId] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not link that student."),
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
      toast.success("Student unlinked.");
      queryClient.invalidateQueries({ queryKey: ["linked-students", parentId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("delete_task", { _task_id: id });
      if (error) throw error;
      const removed = data as { id?: string } | null;
      if (!removed?.id) {
        throw new Error("Could not remove task. Curriculum lessons stay in the library.");
      }
    },
    onSuccess: () => {
      toast.success("Task removed.");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not remove task."),
  });

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
  const quizAttempts = (studyActivity ?? []).filter(
    (row) => row.best_score != null,
  ).length;
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          linkStudent.mutate(linkCode);
        }}
        className="surface-card space-y-3 p-5"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Link2 className="size-4 text-primary" /> Link a student
        </h3>
        <p className="text-xs text-muted-foreground">
          Ask your child for their Parent link code (shown on their dashboard), then paste it here.
        </p>
        <Field label="Parent link code">
          <input
            className="input-base font-mono text-sm"
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
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
          {linkStudent.isPending ? "Linking…" : "Link student"}
        </button>
        {(schemaMissing || (loadError && isMissingLinksSchema(loadError))) && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Database migration required: run{" "}
            <code className="font-mono">supabase/migrations/*_parent_student_links.sql</code> in the
            Supabase SQL editor (or <code className="font-mono">supabase db push</code>), then
            refresh.
          </p>
        )}
      </form>

      {studentsLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading linked students…
        </p>
      )}

      {!studentsLoading && !hasLinks && !schemaMissing && (
        <div className="surface-card p-5 text-sm text-muted-foreground">
          No students linked yet. Ask your child for their <strong>Parent link code</strong> on their
          dashboard, then paste it above.
        </div>
      )}

      {hasLinks && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Viewing
            </span>
            <select
              className="input-base max-w-xs text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value as string | "all")}
            >
              <option value="all">All linked students</option>
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name ?? "Student"}
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
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Student</p>
                    <p className="text-sm font-bold">{s.display_name ?? "Student"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unlinkStudent.mutate(s.id)}
                    disabled={unlinkStudent.isPending}
                    className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                    aria-label={`Unlink ${s.display_name ?? "student"}`}
                    title="Unlink"
                  >
                    <Unlink className="size-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-2xl font-black text-xp">{s.xp_points.toLocaleString()} XP</p>
                <p className="text-xs text-muted-foreground">
                  Level {s.level} · {s.streak_days} day streak
                </p>
              </div>
            ))}
          </div>

          <div className="surface-card p-5">
            <h3 className="text-sm font-bold">Lesson mastery by subject</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on practice quizzes scored at {MASTERY_SCORE_MIN}% or higher
              {selectedId === "all" ? " (all linked students)." : "."}
            </p>
            {(studyMinutes > 0 || quizAttempts > 0) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Study time: <span className="font-semibold text-foreground">{studyMinutes} min</span>
                {quizAttempts > 0
                  ? ` · ${quizAttempts} quiz attempt${quizAttempts === 1 ? "" : "s"} recorded`
                  : " · no quiz submitted yet"}
              </p>
            )}
            {progressLoading && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading mastery…
              </p>
            )}
            {progressLoadError && (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Could not load lesson progress: {progressLoadError}
              </p>
            )}
            {!progressLoading && !progressLoadError && !hasMasteryData && (
              <p className="mt-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                {studyMinutes > 0
                  ? "This student has opened lessons, but has not completed a practice quiz at 70% or higher yet. XP and mastery update when a quiz is passed."
                  : "No completed practice quizzes yet. When your student finishes a lesson quiz at 70% or higher, XP and mastery will show up here."}
              </p>
            )}
            <div className="mt-3 space-y-3">
              {bySubject.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{s.title}</span>
                    <span>
                      {s.done}/{s.total} · {s.pct}%
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
            <h3 className="text-sm font-bold">Manage published lessons</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Curriculum lessons stay in the library. You can only remove tasks you published
              yourself.
            </p>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {(tasks ?? [])
                .filter((t: Task) => !t.is_draft)
                .map((t: Task) => {
                const row = progress?.find(
                  (p) => p.task_id === t.id && p.score >= MASTERY_SCORE_MIN,
                );
                const attempt = (studyActivity ?? [])
                  .filter((a) => a.task_id === t.id)
                  .sort((a, b) => (b.best_score ?? -1) - (a.best_score ?? -1))[0];
                const status = row
                  ? `mastered at ${row.score}%`
                  : attempt?.best_score != null
                    ? `best attempt ${attempt.best_score}% (needs ${MASTERY_SCORE_MIN}%+)`
                    : attempt && attempt.seconds_spent > 0
                      ? "opened — quiz not finished"
                      : "not mastered yet";
                const canRemove = t.created_by === parentId;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.unit_tag ?? "—"} · {t.xp_reward} XP · {status}
                        {!canRemove ? " · curriculum" : ""}
                        {t.lesson_payload ? " · worksheet lesson" : ""}
                      </p>
                    </div>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => remove.mutate(t.id)}
                        disabled={remove.isPending}
                        className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                        aria-label={`Delete ${t.title}`}
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
            <h3 className="text-sm font-bold">Recent AI-graded book reports</h3>
            {reportsLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading reports…
              </p>
            )}
            {!reportsLoading && reports?.length === 0 && (
              <p className="surface-card p-5 text-sm text-muted-foreground">No submissions yet.</p>
            )}
            {(reports ?? []).map((r) => (
              <details key={r.id} className="surface-card p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  {r.chapter_or_topic} —{" "}
                  <span className="text-xp">{r.ai_score ?? "ungraded"}</span>{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({new Date(r.submitted_at).toLocaleString()})
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
