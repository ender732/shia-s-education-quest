const SUBJECT_IMAGES: Record<string, string> = {
  Math: "/subjects/math.png",
  "ELA / Reading": "/subjects/ela.png",
  "Science (NYSSLS)": "/subjects/science.png",
  "Social Studies (Western Hemisphere)": "/subjects/social.png",
  "Assigned Reading": "/subjects/assigned-reading.png",
};

export function imageForSubject(title: string): string | null {
  return SUBJECT_IMAGES[title] ?? null;
}
