import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock3, Medal, Trophy, Users } from "lucide-react";
import { useTranslation, type TranslateFn } from "@/i18n";
import {
  DAILY_LEADERBOARD_QUERY_KEY,
  durationParts,
  fetchDailyLeaderboard,
  formatDuration,
  getTodayEtDateString,
} from "@/lib/daily-activity";

export { DAILY_LEADERBOARD_QUERY_KEY };

/** Localized "1h 4m 12s" for the wide-screen hint next to the clock value. */
function friendlyDuration(t: TranslateFn, totalSeconds: number): string {
  const { hours, minutes, seconds, key } = durationParts(totalSeconds);
  return t(`leaderboard.duration.${key}`, { hours, minutes, seconds });
}

export function DailyLeaderboard({ userId }: { userId: string }) {
  const { t, formatNumber } = useTranslation();
  const today = getTodayEtDateString();

  const { data, isLoading, isError } = useQuery({
    queryKey: [DAILY_LEADERBOARD_QUERY_KEY, today],
    queryFn: () => fetchDailyLeaderboard(today),
    refetchInterval: 60_000,
  });

  const rows = data?.rows ?? [];
  const unavailable = data?.unavailable ?? false;

  return (
    <section className="surface-card overflow-hidden" aria-labelledby="leaderboard-heading">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2
              id="leaderboard-heading"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              <Trophy className="size-3.5 text-xp" aria-hidden />
              {t("leaderboard.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("leaderboard.resetNote")}</p>
          </div>
          <span className="rounded-md border border-border bg-background/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {today}
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground" role="status">
            {t("leaderboard.loading")}
          </p>
        ) : unavailable || isError ? (
          <EmptyState
            icon={<Users className="size-5 text-muted-foreground" aria-hidden />}
            title={t("leaderboard.unavailableTitle")}
            body={t("leaderboard.unavailableBody")}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Medal className="size-5 text-xp" aria-hidden />}
            title={t("leaderboard.emptyTitle")}
            body={t("leaderboard.emptyBody")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-start text-sm">
              <caption className="sr-only">{t("leaderboard.title")}</caption>
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-2 py-2 font-bold">{t("leaderboard.rank")}</th>
                  <th scope="col" className="px-2 py-2 font-bold">{t("leaderboard.name")}</th>
                  <th scope="col" className="px-2 py-2 font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" aria-hidden /> {t("leaderboard.timeToday")}
                    </span>
                  </th>
                  <th scope="col" className="px-2 py-2 font-bold text-end">
                    {t("leaderboard.bestScore")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isMe = row.user_id === userId;
                  return (
                    <motion.tr
                      key={row.user_id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-t border-border/70 ${
                        isMe ? "bg-primary/10 font-semibold" : ""
                      }`}
                    >
                      <td className="px-2 py-2.5 tabular-nums">
                        <RankBadge rank={row.rank} />
                      </td>
                      <td className="px-2 py-2.5">
                        {row.display_name}
                        {isMe && (
                          <span className="ms-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            {t("common.you")}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-muted-foreground">
                        {formatDuration(row.total_seconds, "clock")}
                        <span className="ms-1.5 hidden text-[10px] sm:inline">
                          ({friendlyDuration(t, row.total_seconds)})
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-end tabular-nums">
                        {row.best_score != null ? (
                          <span className="text-xp">
                            {t("common.percent", { value: formatNumber(row.best_score) })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t("common.none")}</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xp">
        <Medal className="size-3.5" aria-hidden />
        {rank}
      </span>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
      {icon}
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
