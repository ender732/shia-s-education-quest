import { youtubeEmbedUrl } from "@/lib/youtube";

export function LessonVideo({
  youtubeVideoId,
  youtubeTitle,
  youtubeChannel,
}: {
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeChannel?: string;
}) {
  if (!youtubeVideoId) return null;

  const embedSrc = youtubeEmbedUrl(youtubeVideoId);
  if (!embedSrc) return null;

  const label = youtubeTitle ?? "Lesson explainer video";
  const channel = youtubeChannel ?? "Crash Course Kids";

  return (
    <figure className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-background/80">
        <iframe
          className="absolute inset-0 size-full"
          src={embedSrc}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">
        {channel}
        {youtubeTitle ? ` · ${youtubeTitle}` : null}
      </figcaption>
    </figure>
  );
}
