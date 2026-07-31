import { youtubeEmbedUrl } from "@/lib/youtube";

export function LessonVideo({
  youtubeVideoId,
  youtubeTitle,
}: {
  youtubeVideoId?: string;
  youtubeTitle?: string;
}) {
  if (!youtubeVideoId) return null;

  const label = youtubeTitle ?? "Lesson explainer video";

  return (
    <figure className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-background/80">
        <iframe
          className="absolute inset-0 size-full"
          src={youtubeEmbedUrl(youtubeVideoId)}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">
        Crash Course Kids
        {youtubeTitle ? ` · ${youtubeTitle}` : null}
      </figcaption>
    </figure>
  );
}
