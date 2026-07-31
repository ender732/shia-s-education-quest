import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CURRICULUM_UNIT_TAGS } from "@/lib/curriculum";
import { FeedbackCard } from "./BookStudio";
import { useTasks, type Task } from "./TaskBoard";

type Subject = { id: string; title: string };

export function ParentPortal({ userId, subjects }: { userId: string; subjects: Subject[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TaskCreator userId={userId} subjects={subjects} />
        <BookUploader userId={userId} />
      </div>
      <ProgressMonitor subjects={subjects} />
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
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      let path: string | null = null;
      if (file) {
        const key = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("assigned-books")
          .upload(key, file, { contentType: file.type || "application/pdf" });
        if (uploadError) throw uploadError;
        path = key;
      }
      const { error } = await supabase.from("assigned_books").insert({
        title,
        author: author || null,
        pdf_url: path,
        prompt: prompt || null,
        assigned_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book assigned.");
      setTitle("");
      setAuthor("");
      setPrompt("");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["assigned_books"] });
    },
    onError: (err: Error) => toast.error(err.message || "Upload failed."),
  });

  return (
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
      <Field label="PDF file">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="input-base file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-secondary-foreground"
        />
      </Field>
      <button
        type="submit"
        disabled={upload.isPending}
        className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
      >
        {upload.isPending ? "Uploading…" : "Assign book"}
      </button>
    </form>
  );
}

function ProgressMonitor({ subjects }: { subjects: Subject[] }) {
  const { data: tasks } = useTasks();
  const queryClient = useQueryClient();

  const { data: students } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, xp_points, level, streak_days")
        .eq("role", "student");
      if (error) throw error;
      return data ?? [];
    },
  });

  const studentId = students?.[0]?.id;
  const { data: progress } = useQuery({
    queryKey: ["task_progress_all"],
    queryFn: async () => {
      const { fetchAllTaskProgress } = await import("@/lib/task-progress");
      return fetchAllTaskProgress();
    },
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["book_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_reports")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task removed.");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completedIds = new Set((progress ?? []).map((p) => p.task_id));

  const bySubject = subjects.map((s) => {
    const list = (tasks ?? []).filter((t: Task) => t.subject_id === s.id);
    const done = list.filter((t) => completedIds.has(t.id)).length;
    return { ...s, total: list.length, done, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(students ?? []).map((s) => (
          <div key={s.id} className="surface-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Student</p>
            <p className="text-sm font-bold">{s.display_name ?? "Student"}</p>
            <p className="mt-2 text-2xl font-black text-xp">{s.xp_points.toLocaleString()} XP</p>
            <p className="text-xs text-muted-foreground">
              Level {s.level} · {s.streak_days} day streak
            </p>
          </div>
        ))}
        {students?.length === 0 && (
          <div className="surface-card p-4 text-sm text-muted-foreground">
            No student accounts yet.
          </div>
        )}
      </div>

      <div className="surface-card p-5">
        <h3 className="text-sm font-bold">Lesson mastery by subject</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Based on practice quizzes scored at 70% or higher.
        </p>
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
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
          {(tasks ?? []).map((t: Task) => {
            const row = progress?.find((p) => p.task_id === t.id);
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.unit_tag ?? "—"} · {t.xp_reward} XP ·{" "}
                    {row ? `mastered at ${row.score}%` : "not mastered yet"}
                  </p>
                </div>
                <button
                  onClick={() => remove.mutate(t.id)}
                  className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`Delete ${t.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold">Recent AI-graded book reports</h3>
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading reports…
          </p>
        )}
        {reports?.length === 0 && (
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
