import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Bot,
  Eye,
  Loader2,
  LogIn,
  Share2,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const userId = context.user.id;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", userId)
      .maybeSingle();
    if (error || !profile || profile.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
    return { adminProfile: profile };
  },
  head: () => ({
    meta: [
      { title: "Site analytics — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAnalyticsPage,
});

type Overview = {
  days: number;
  page_views: number;
  unique_visitors: number;
  sessions: number;
  human_sessions: number;
  bot_sessions: number;
  signups: number;
  logins: number;
  shares: number;
};

type DailyRow = {
  day: string;
  page_views: number;
  visitors: number;
  bot_sessions: number;
};

type PageRow = { path: string; views: number };
type ReferrerRow = { referrer: string; sessions: number };
type BotBreakdown = {
  human_sessions: number;
  bot_sessions: number;
  by_name: { bot_name: string; sessions: number }[];
};
type RecentEvent = {
  id: string;
  event_name: string;
  path: string | null;
  referrer: string | null;
  is_bot: boolean;
  bot_name: string | null;
  visitor_id: string;
  user_id: string | null;
  properties: Record<string, unknown>;
  created_at: string;
};

const DAYS = 14;

async function rpcJson<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as "get_analytics_overview", args as never);
  if (error) throw error;
  return data as T;
}

function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const { adminProfile } = Route.useRouteContext();

  const overview = useQuery({
    queryKey: ["admin-analytics", "overview", DAYS],
    queryFn: () => rpcJson<Overview>("get_analytics_overview", { _days: DAYS }),
  });
  const daily = useQuery({
    queryKey: ["admin-analytics", "daily", DAYS],
    queryFn: () => rpcJson<DailyRow[]>("get_analytics_daily", { _days: DAYS }),
  });
  const pages = useQuery({
    queryKey: ["admin-analytics", "pages", DAYS],
    queryFn: () =>
      rpcJson<PageRow[]>("get_analytics_top_pages", { _days: DAYS, _limit: 15 }),
  });
  const referrers = useQuery({
    queryKey: ["admin-analytics", "referrers", DAYS],
    queryFn: () =>
      rpcJson<ReferrerRow[]>("get_analytics_referrers", { _days: DAYS, _limit: 15 }),
  });
  const bots = useQuery({
    queryKey: ["admin-analytics", "bots", DAYS],
    queryFn: () => rpcJson<BotBreakdown>("get_analytics_bots", { _days: DAYS }),
  });
  const recent = useQuery({
    queryKey: ["admin-analytics", "recent"],
    queryFn: () => rpcJson<RecentEvent[]>("get_analytics_recent_events", { _limit: 40 }),
    refetchInterval: 30_000,
  });

  const loading =
    overview.isLoading || daily.isLoading || pages.isLoading || referrers.isLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading analytics…
      </div>
    );
  }

  if (overview.isError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-destructive">
          Could not load analytics. Confirm your profile role is{" "}
          <code className="text-xs">admin</code>.
        </p>
        <button
          type="button"
          className="mt-4 text-sm text-primary underline"
          onClick={() => navigate({ to: "/dashboard" })}
        >
          Back to dashboard
        </button>
      </main>
    );
  }

  const o = overview.data!;
  const chartData = (daily.data ?? []).map((row) => ({
    ...row,
    label: String(row.day).slice(5),
  }));
  const maxPage = Math.max(1, ...(pages.data ?? []).map((p) => p.views));
  const maxRef = Math.max(1, ...(referrers.data ?? []).map((r) => r.sessions));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Admin · first-party analytics
          </p>
          <h1 className="mt-1 text-2xl font-bold">Site traffic</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last {DAYS} days · signed in as {adminProfile.display_name ?? "admin"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
          >
            <ArrowLeft className="size-3.5" /> Dashboard
          </Link>
        </div>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Eye className="size-4 text-primary" />} label="Page views" value={o.page_views} />
        <Kpi
          icon={<Users className="size-4 text-xp" />}
          label="Unique visitors"
          value={o.unique_visitors}
        />
        <Kpi
          icon={<LogIn className="size-4 text-success" />}
          label="Logins / signups"
          value={`${o.logins} / ${o.signups}`}
        />
        <Kpi
          icon={<Share2 className="size-4 text-reading" />}
          label="Shares & copies"
          value={o.shares}
        />
      </section>

      <section className="surface-card mb-6 p-4 sm:p-5">
        <h2 className="text-sm font-bold">Traffic over time</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Human visitors and page views (UTC days). Bot sessions shown separately.
        </p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.16 225)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="oklch(0.78 0.16 225)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.35 0.03 265)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "oklch(0.72 0.03 255)", fontSize: 11 }} />
              <YAxis tick={{ fill: "oklch(0.72 0.03 255)", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.21 0.034 265)",
                  border: "1px solid oklch(0.35 0.03 265)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="page_views"
                name="Page views"
                stroke="oklch(0.78 0.16 225)"
                fill="url(#pvFill)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name="Visitors"
                stroke="oklch(0.82 0.14 85)"
                fill="transparent"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="bot_sessions"
                name="Bot sessions"
                stroke="oklch(0.7 0.12 25)"
                fill="transparent"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-4 sm:p-5">
          <h2 className="text-sm font-bold">Top pages</h2>
          <ul className="mt-3 space-y-2">
            {(pages.data ?? []).length === 0 && (
              <li className="text-xs text-muted-foreground">No page views yet.</li>
            )}
            {(pages.data ?? []).map((row) => (
              <li key={row.path} className="text-xs">
                <div className="mb-1 flex justify-between gap-2">
                  <span className="truncate font-medium">{row.path}</span>
                  <span className="shrink-0 text-muted-foreground">{row.views}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${(row.views / maxPage) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-4 sm:p-5">
          <h2 className="text-sm font-bold">Referrers</h2>
          <ul className="mt-3 space-y-2">
            {(referrers.data ?? []).length === 0 && (
              <li className="text-xs text-muted-foreground">No sessions yet.</li>
            )}
            {(referrers.data ?? []).map((row) => (
              <li key={row.referrer} className="text-xs">
                <div className="mb-1 flex justify-between gap-2">
                  <span className="truncate font-medium">{row.referrer}</span>
                  <span className="shrink-0 text-muted-foreground">{row.sessions}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-xp/80"
                    style={{ width: `${(row.sessions / maxRef) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Bot className="size-4 text-muted-foreground" /> Bots vs humans
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-border bg-background/50 p-3">
              <p className="text-2xl font-bold">{bots.data?.human_sessions ?? o.human_sessions}</p>
              <p className="text-[11px] text-muted-foreground">Human sessions</p>
            </div>
            <div className="rounded-xl border border-border bg-background/50 p-3">
              <p className="text-2xl font-bold">{bots.data?.bot_sessions ?? o.bot_sessions}</p>
              <p className="text-[11px] text-muted-foreground">Bot sessions</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {(bots.data?.by_name ?? []).map((b) => (
              <li
                key={b.bot_name}
                className="flex justify-between text-xs text-muted-foreground"
              >
                <span>{b.bot_name}</span>
                <span>{b.sessions}</span>
              </li>
            ))}
            {(bots.data?.by_name ?? []).length === 0 && (
              <li className="text-xs text-muted-foreground">No known crawlers yet.</li>
            )}
          </ul>
        </section>

        <section className="surface-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Activity className="size-4 text-primary" /> Recent events
          </h2>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {(recent.data ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Waiting for traffic…</p>
            )}
            {(recent.data ?? []).map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{ev.event_name}</span>
                  <span className="text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-muted-foreground">
                  {ev.path ?? "—"}
                  {ev.is_bot ? ` · bot:${ev.bot_name ?? "yes"}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Purpose-limited first-party telemetry only: page paths, referrers, UTM params, coarse
        screen size, language, timezone offset, UA classification, and hashed IP when the server
        beacon runs. No passwords, no full emails in events, no cross-site fingerprinting.
      </p>
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="surface-card flex items-start gap-3 p-4">
      <div className="mt-0.5 rounded-lg border border-border bg-background/60 p-2">{icon}</div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
