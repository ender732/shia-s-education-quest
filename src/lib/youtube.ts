const YOUTUBE_ID_RE = /^[\w-]{11}$/;

/** Build a privacy-enhanced YouTube embed URL from an 11-char video id. */
export function youtubeEmbedUrl(id: string): string | null {
  if (!YOUTUBE_ID_RE.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
