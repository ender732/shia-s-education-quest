const YOUTUBE_ID_RE = /^[\w-]{11}$/;

export function isValidYoutubeId(id: string | undefined | null): boolean {
  return Boolean(id && YOUTUBE_ID_RE.test(id));
}

/** Build a privacy-enhanced YouTube embed URL from an 11-char video id. */
export function youtubeEmbedUrl(id: string): string | null {
  if (!isValidYoutubeId(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
