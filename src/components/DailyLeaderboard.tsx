import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock3, Medal, Trophy, Users } from "lucide-react";
import {
  DAILY_LEADERBOARD_QUERY_KEY,
  fetchDailyLeaderboard,
  formatDuration,
  getTodayEtDateString,
} from "@/lib/daily-activity";

export { DAILY_LEADERBOARD_QUERY_KEY };

export function DailyLeaderboard({ userId }: { userId: string }) {
  const today = getTodayEtDateString();

  const { data, isLoading, isError } = useQuery({
    queryKey: [DAILY_LEADERBOARD_QUERY_KEY, today],
    queryFn: () => fetchDailyLeaderboard(today),
    refetchInterval: 60_000,
  });

  const rows = data?.rows ?? [];
  const unavailable = data?.unavailable ?? false;

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Trophy className="size-3.5 text-xp" />
              Today&apos;s Quest Challenge
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Resets at midnight Eastern (America/New_York)
            </p>
          </div>
          <span className="rounded-md border border-border bg-background/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {today}
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading today&apos;s rankings…</p>
        ) : unavailable || isError ? (
          <EmptyState
            icon={<Users className="size-5 text-muted-foreground" />}
            title="Leaderboard not ready yet"
            body="Ask a parent to run the daily leaderboard migration, then practice a lesson to appear here."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Medal className="size-5 text-xp" />}
            title="No challengers yet today"
            body="Open a lesson and practice — time and your best quiz score count toward today's challenge."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2 font-bold">Rank</th>
                  <th className="px-2 py-2 font-bold">Name</th>
                  <th className="px-2 py-2 font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" /> Time today
                    </span>
                  </th>
                  <th className="px-2 py-2 font-bold text-right">Best score</th>
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
                          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-muted-foreground">
                        {formatDuration(row.total_seconds, "clock")}
                        <span className="ml-1.5 hidden text-[10px] sm:inline">
                          ({formatDuration(row.total_seconds, "friendly")})
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {row.best_score != null ? (
                          <span className="text-xp">{row.best_score}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
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
        <Medal className="size-3.5" />
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
