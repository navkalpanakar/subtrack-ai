"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  TrendingUp,
  Activity,
  DollarSign,
  CreditCard,
  Bot,
  Trophy,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Metrics = {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    active7d: number;
    churned30d: number;
    byCountryTop5: Array<{ country: string; users: number }>;
  };
  revenue: {
    mrrByCurrency: Record<string, number>;
    totalUsdMrr: number;
    yearlyByCurrency: Record<string, number>;
    totalUsdYearly: number;
  };
  subscriptions: {
    total: number;
    active: number;
    cancelled: number;
    cancellationRate: number;
    avgSpendPerUserUsd: number;
    topProviders: Array<{ provider: string; count: number; monthlyUsd: number }>;
  };
  ai: {
    totalCalls: number;
    calls7d: number;
    totalCostUsd: number;
    cost7dUsd: number;
    byEndpoint: Array<{ endpoint: string; count: number; costUsd: number }>;
  };
  gamification: {
    totalPointsDistributed: number;
    spinsToday: number;
    leaderboardSize: number;
  };
  generatedAt: string;
};

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 100 ? 2 : 0,
  });
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  accent?: "primary" | "secondary" | "destructive" | "default";
}) {
  const accentClass =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "secondary"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : accent === "destructive"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
            {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { adminFetch } = useAdminAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminFetch("/api/admin/metrics")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load metrics");
        const data: Metrics = await r.json();
        if (!cancelled) setMetrics(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminFetch]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading metrics…
      </div>
    );
  }
  if (error || !metrics) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" /> {error || "Failed to load"}
      </div>
    );
  }

  const m = metrics;
  const maxProviderUsd = Math.max(1, ...m.subscriptions.topProviders.map((p) => p.monthlyUsd));
  const maxCountryUsers = Math.max(1, ...m.users.byCountryTop5.map((c) => c.users));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live overview of users, revenue, AI usage and gamification. Generated{" "}
          {new Date(m.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* User metrics */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">Users</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={Users}
            label="Total users"
            value={fmtNum(m.users.total)}
            sub={`${m.users.active7d} active (7d)`}
          />
          <StatCard
            icon={UserPlus}
            label="New today"
            value={fmtNum(m.users.newToday)}
            sub={`${m.users.newThisWeek} this week`}
            accent="secondary"
          />
          <StatCard
            icon={Activity}
            label="Active (7d)"
            value={fmtNum(m.users.active7d)}
            sub={`${m.users.total === 0 ? 0 : Math.round((m.users.active7d / m.users.total) * 100)}% of total`}
          />
          <StatCard
            icon={TrendingUp}
            label="Churned (30d)"
            value={fmtNum(m.users.churned30d)}
            sub={`${m.users.total === 0 ? 0 : Math.round((m.users.churned30d / m.users.total) * 100)}% of total`}
            accent="destructive"
          />
          <StatCard
            icon={CreditCard}
            label="Premium users"
            value="—"
            sub="Upgrade via Users tab"
          />
        </div>
      </section>

      {/* Revenue */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">Revenue</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={DollarSign}
            label="MRR (USD equiv.)"
            value={fmtUsd(m.revenue.totalUsdMrr)}
            sub="Sum of active subs / cycle"
          />
          <StatCard
            icon={TrendingUp}
            label="ARR (USD equiv.)"
            value={fmtUsd(m.revenue.totalUsdYearly)}
            sub="MRR × 12"
            accent="secondary"
          />
          <StatCard
            icon={CreditCard}
            label="Active subs"
            value={fmtNum(m.subscriptions.active)}
            sub={`${m.subscriptions.total} total tracked`}
          />
          <StatCard
            icon={Activity}
            label="Avg spend / user"
            value={fmtUsd(m.subscriptions.avgSpendPerUserUsd)}
            sub="Monthly USD"
          />
        </div>
        {/* MRR by currency */}
        <Card className="mt-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">MRR by currency</CardTitle>
            <CardDescription>Monthly recurring revenue per currency (raw, not converted)</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(m.revenue.mrrByCurrency).length === 0 ? (
              <div className="text-sm text-muted-foreground">No active subscriptions yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(m.revenue.mrrByCurrency)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cur, amt]) => (
                    <Badge key={cur} variant="secondary" className="text-sm">
                      {cur} {amt.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </Badge>
                  ))}
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              Cancellation rate:{" "}
              <span className="font-semibold text-foreground">
                {(m.subscriptions.cancellationRate * 100).toFixed(1)}%
              </span>{" "}
              ({m.subscriptions.cancelled} cancelled of {m.subscriptions.total})
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Top providers */}
      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 10 subscription providers (by monthly USD)</CardTitle>
            <CardDescription>Active subscriptions only</CardDescription>
          </CardHeader>
          <CardContent>
            {m.subscriptions.topProviders.length === 0 ? (
              <div className="text-sm text-muted-foreground">No active subscriptions.</div>
            ) : (
              <div className="space-y-3">
                {m.subscriptions.topProviders.map((p) => (
                  <div key={p.provider} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p.provider}</span>
                      <span className="text-muted-foreground">
                        {p.count} sub{p.count !== 1 ? "s" : ""} · {fmtUsd(p.monthlyUsd)}/mo
                      </span>
                    </div>
                    <Progress value={(p.monthlyUsd / maxProviderUsd) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI usage */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">AI usage</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard icon={Bot} label="Total AI calls" value={fmtNum(m.ai.totalCalls)} sub={`${m.ai.calls7d} in last 7d`} />
            <StatCard
              icon={DollarSign}
              label="Est. AI cost (total)"
              value={fmtUsd(m.ai.totalCostUsd)}
              sub={`${fmtUsd(m.ai.cost7dUsd)} in last 7d`}
              accent="secondary"
            />
          </div>
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Calls by endpoint</CardTitle>
            </CardHeader>
            <CardContent>
              {m.ai.byEndpoint.length === 0 ? (
                <div className="text-sm text-muted-foreground">No AI calls logged yet.</div>
              ) : (
                <div className="space-y-2">
                  {m.ai.byEndpoint.map((e) => (
                    <div key={e.endpoint} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{e.endpoint}</span>
                      <span className="text-muted-foreground">
                        {fmtNum(e.count)} calls · {fmtUsd(e.costUsd)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Gamification */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Gamification</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Trophy}
              label="Points distributed"
              value={fmtNum(m.gamification.totalPointsDistributed)}
            />
            <StatCard
              icon={Activity}
              label="Spins today"
              value={fmtNum(m.gamification.spinsToday)}
              accent="secondary"
            />
            <StatCard
              icon={Users}
              label="Leaderboard size"
              value={fmtNum(m.gamification.leaderboardSize)}
              sub="Users with > 0 pts"
            />
          </div>
        </section>
      </div>

      {/* Geographic */}
      <section>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 5 countries by users</CardTitle>
          </CardHeader>
          <CardContent>
            {m.users.byCountryTop5.length === 0 ? (
              <div className="text-sm text-muted-foreground">No country data yet.</div>
            ) : (
              <div className="space-y-3">
                {m.users.byCountryTop5.map((c) => (
                  <div key={c.country} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.country}</span>
                      <span className="text-muted-foreground">{fmtNum(c.users)} users</span>
                    </div>
                    <Progress value={(c.users / maxCountryUsers) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
