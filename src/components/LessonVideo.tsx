import { ChevronDown, FileText } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "@/i18n";
import { youtubeEmbedUrl } from "@/lib/youtube";

export function LessonVideo({
  youtubeVideoId,
  youtubeTitle,
  youtubeChannel,
  transcript,
}: {
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeChannel?: string;
  /** Readable lesson transcript for students who prefer reading. */
  transcript?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { t } = useTranslation();

  if (!youtubeVideoId) return null;

  const embedSrc = youtubeEmbedUrl(youtubeVideoId);
  if (!embedSrc) return null;

  const label = youtubeTitle ?? t("lesson.video.defaultTitle");
  const channel = youtubeChannel ?? t("lesson.video.defaultChannel");
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  const hasTranscript = Boolean(transcript?.trim());

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

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary"
        >
          <FileText className="size-4 shrink-0 text-primary" aria-hidden />
          {open ? t("lesson.video.hideTranscript") : t("lesson.video.readTranscript")}
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {open && (
          <div
            id={panelId}
            className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-border bg-background/50 p-3 text-sm leading-relaxed sm:max-h-80"
            role="region"
            aria-label={t("lesson.video.transcriptAria")}
          >
            {hasTranscript ? (
              transcript!
                .trim()
                .split(/\n\n+/)
                .map((paragraph, index) => (
                  <p key={index} className="text-muted-foreground">
                    {paragraph}
                  </p>
                ))
            ) : (
              <p className="text-muted-foreground">{t("lesson.video.transcriptUnavailable")}</p>
            )}
            <a
              href={youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              {t("lesson.video.openOnYouTube")}
            </a>
          </div>
        )}
      </div>
    </figure>
  );
}
