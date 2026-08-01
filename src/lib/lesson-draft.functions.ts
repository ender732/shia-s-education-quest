import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LessonPayload } from "@/lib/lesson-payload";

const WORKSHEETS_BUCKET = "lesson-worksheets";

const GenerateInput = z.object({
  storagePath: z
    .string()
    .min(3)
    .max(500)
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/i, "Invalid storage path."),
  subjectId: z.string().uuid(),
  titleHint: z.string().max(200).optional().default(""),
  sourceCredit: z.string().max(300).optional().default(""),
  subjectHint: z.string().max(120).optional().default(""),
  xpReward: z.number().int().min(10).max(500).optional().default(100),
});

const PublishInput = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  sourceCredit: z.string().max(300).optional().nullable(),
});

const DiscardInput = z.object({
  taskId: z.string().uuid(),
});

const RematchVideosInput = z.object({
  /** Optional: rematch one task. Omit to rematch all of this parent's payload lessons. */
  taskId: z.string().uuid().optional(),
});

async function assertParentOrAdmin(
  supabase: { rpc: Function } & Record<string, unknown>,
  userId: string,
) {
  const [{ data: isParent }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("is_parent", { _uid: userId }),
    supabase.rpc("is_admin", { _uid: userId }),
  ]);
  if (!isParent && !isAdmin) {
    throw new Error("Only parents or admins can manage lesson drafts.");
  }
}

export const generateLessonDraftFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertParentOrAdmin(supabase as never, userId);

    if (!data.storagePath.startsWith(`${userId}/`)) {
      throw new Error("PDF path must be under your own uploads folder.");
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from(WORKSHEETS_BUCKET)
      .download(data.storagePath);

    if (downloadError || !file) {
      console.error("[generateLessonDraftFromPdf] download", downloadError?.message);
      throw new Error("Could not download the uploaded PDF. Try uploading again.");
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const { extractPdfText, draftLessonFromPdfText } = await import("./lesson-draft.server");
    const pdfText = await extractPdfText(buffer);
    const payload = await draftLessonFromPdfText({
      pdfText,
      subjectHint: data.subjectHint || undefined,
      sourceCredit: data.sourceCredit || undefined,
      titleHint: data.titleHint || undefined,
    });

    const title = (data.titleHint || payload.title).slice(0, 200);
    const description = [
      payload.worksheet?.instructions,
      payload.sourceCredit ? `Credit: ${payload.sourceCredit}` : null,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2000);

    const { data: task, error: insertError } = await supabase
      .from("tasks")
      .insert({
        subject_id: data.subjectId,
        title,
        description: description || null,
        unit_tag: payload.unitTag,
        xp_reward: data.xpReward,
        created_by: userId,
        is_draft: true,
        lesson_payload: payload as never,
        worksheet_pdf_url: data.storagePath,
        source_credit: data.sourceCredit || payload.sourceCredit || null,
      })
      .select("*")
      .single();

    if (insertError || !task) {
      console.error("[generateLessonDraftFromPdf] insert", insertError?.message);
      throw new Error("Could not save the lesson draft. Please try again.");
    }

    return { task, payload: payload as LessonPayload };
  });

export const publishLessonDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PublishInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertParentOrAdmin(supabase as never, userId);

    const { data: existing, error: loadError } = await supabase
      .from("tasks")
      .select("id, created_by, is_draft, lesson_payload")
      .eq("id", data.taskId)
      .maybeSingle();

    if (loadError || !existing) {
      throw new Error("Draft not found.");
    }
    if (existing.created_by !== userId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _uid: userId });
      if (!isAdmin) throw new Error("You can only publish your own drafts.");
    }
    if (!existing.is_draft) {
      throw new Error("This lesson is already published.");
    }
    if (!existing.lesson_payload) {
      throw new Error("This draft has no lesson content to publish.");
    }

    const { attachMatchedVideoToPayload } = await import("./lesson-videos");
    const basePayload = existing.lesson_payload as LessonPayload;
    const rematched = attachMatchedVideoToPayload(basePayload);

    const updates: {
      is_draft: boolean;
      published_at: string;
      title?: string;
      description?: string | null;
      source_credit?: string | null;
      lesson_payload?: LessonPayload;
    } = {
      is_draft: false,
      published_at: new Date().toISOString(),
      lesson_payload: rematched,
    };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.sourceCredit !== undefined) {
      updates.source_credit = data.sourceCredit;
      updates.lesson_payload = {
        ...rematched,
        sourceCredit: data.sourceCredit ?? rematched.sourceCredit,
      };
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", data.taskId)
      .select("*")
      .single();

    if (error || !task) {
      console.error("[publishLessonDraft]", error?.message);
      throw new Error("Could not publish this lesson. Please try again.");
    }
    return { task };
  });

export const discardLessonDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DiscardInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertParentOrAdmin(supabase as never, userId);

    const { data: existing, error: loadError } = await supabase
      .from("tasks")
      .select("id, created_by, is_draft, worksheet_pdf_url")
      .eq("id", data.taskId)
      .maybeSingle();

    if (loadError || !existing) {
      throw new Error("Draft not found.");
    }
    if (!existing.is_draft) {
      throw new Error("Only unpublished drafts can be discarded here. Use Remove for published lessons.");
    }

    const { data: removed, error } = await supabase.rpc("delete_task", {
      _task_id: data.taskId,
    });
    if (error) {
      throw new Error(error.message || "Could not discard draft.");
    }

    if (existing.worksheet_pdf_url?.startsWith(`${userId}/`)) {
      await supabase.storage.from(WORKSHEETS_BUCKET).remove([existing.worksheet_pdf_url]);
    }

    return { removed };
  });

/**
 * Re-run curated video matching on existing worksheet lessons (drafts + published).
 * Fixes cases where older matching attached the wrong subject video (e.g. magnets → ecosystems).
 */
export const rematchLessonVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RematchVideosInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertParentOrAdmin(supabase as never, userId);

    const { attachMatchedVideoToPayload } = await import("./lesson-videos");

    let query = supabase
      .from("tasks")
      .select("id, title, unit_tag, created_by, lesson_payload, subjects(title)")
      .not("lesson_payload", "is", null)
      .eq("created_by", userId);

    if (data.taskId) {
      query = query.eq("id", data.taskId);
    }

    const { data: rows, error: loadError } = await query;
    if (loadError) {
      console.error("[rematchLessonVideos] load", loadError.message);
      throw new Error("Could not load lessons to update videos.");
    }

    const results: Array<{
      taskId: string;
      title: string;
      previous: string | null;
      next: string | null;
      changed: boolean;
    }> = [];

    for (const row of rows ?? []) {
      const payload = row.lesson_payload as LessonPayload | null;
      if (!payload?.title || !Array.isArray(payload.teach)) continue;

      const subjectHint =
        (row as { subjects?: { title?: string } | null }).subjects?.title ||
        undefined;
      const previous = payload.youtubeTitle ?? payload.youtubeVideoId ?? null;
      const nextPayload = attachMatchedVideoToPayload(payload, { subjectHint });
      const next = nextPayload.youtubeTitle ?? nextPayload.youtubeVideoId ?? null;
      const changed =
        (nextPayload.youtubeVideoId ?? null) !== (payload.youtubeVideoId ?? null) ||
        (nextPayload.youtubeTitle ?? null) !== (payload.youtubeTitle ?? null);

      if (changed) {
        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            lesson_payload: nextPayload as never,
            unit_tag: nextPayload.unitTag ?? row.unit_tag,
          })
          .eq("id", row.id)
          .eq("created_by", userId);

        if (updateError) {
          console.error("[rematchLessonVideos] update", row.id, updateError.message);
          continue;
        }
      }

      results.push({
        taskId: row.id,
        title: payload.title || row.title,
        previous,
        next,
        changed,
      });
    }

    return {
      scanned: results.length,
      updated: results.filter((r) => r.changed).length,
      results,
    };
  });
