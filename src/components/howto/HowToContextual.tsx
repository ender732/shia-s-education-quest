import { useHowToShort } from "@/hooks/useHowToShort";

/** Mounts a contextual how-to short for a screen (auto once if unseen). */
export function HowToContextual({
  userId,
  shortId,
  enabled = true,
}: {
  userId: string | undefined;
  shortId: string;
  enabled?: boolean;
}) {
  const { player } = useHowToShort({ userId, shortId, enabled });
  return player;
}
