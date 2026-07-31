/** Build a privacy-enhanced YouTube embed URL from an 11-char video id. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
