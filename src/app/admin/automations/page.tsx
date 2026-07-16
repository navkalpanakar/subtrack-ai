"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Flame,
  Moon,
  AlertTriangle,
  UserPlus,
  Clock,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type HighSpendUser = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    country: string | null;
    currency: string | null;
    plan: string;
  };
  monthlyUsd: number;
  activeSubs: number;
};

type InactiveUser = {
  id: string;
  name: string | null;
  email: string | null;
  updatedAt: string;
  createdAt: string;
  country: string | null;
  activeSubs: number;
  lastSeen: string;
};

type RecentCancellation = {
  id: string;
  name: string;
  provider: string;
  amount: number;
  currency: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null; country: string | null };
};

type RecentSignup = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  country: string | null;
  plan: string;
  currency: string | null;
};

type ZeroSubUser = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  country: string | null;
};

type Automations = {
  highSpendUsers: HighSpendUser[];
  inactiveUsers: InactiveUser[];
  churnRisk: {
    zeroSubUsers: ZeroSubUser[];
    recentCancellations: RecentCancellation[];
  };
  recentSignups: RecentSignup[];
  counts: {
    highSpend: number;
    inactive: number;
    churnRiskZeroSub: number;
    churnRiskCancelled: number;
    recentSignups: number;
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

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function AdminAutomationsPage() {
  const { adminFetch } = useAdminAuth();
  const [data, setData] = useState<Automations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminFetch("/api/admin/automations")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load automations");
        const d: Automations = await r.json();
        if (!cancelled) setData(d);
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
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Computing alerts…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" /> {error || "Failed to load"}
      </div>
    );
  }

  const d = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
        <p className="text-sm text-muted-foreground">
          Automated alerts highlighting users who may need attention. Generated{" "}
          {new Date(d.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Flame className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">High spend</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{d.counts.highSpend}</div>
            <div className="text-xs text-muted-foreground">top 10 by monthly USD</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Moon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Inactive</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{d.counts.inactive}</div>
            <div className="text-xs text-muted-foreground">30+ days no activity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Churn risk</span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              {d.counts.churnRiskZeroSub + d.counts.churnRiskCancelled}
            </div>
            <div className="text-xs text-muted-foreground">0 subs or recent cancel</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <UserPlus className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">New (24h)</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{d.counts.recentSignups}</div>
            <div className="text-xs text-muted-foreground">signups in last 24h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Generated</span>
            </div>
            <div className="mt-1 text-sm font-medium">
              {new Date(d.generatedAt).toLocaleTimeString()}
            </div>
            <div className="text-xs text-muted-foreground">{new Date(d.generatedAt).toLocaleDateString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* High-spend users */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            High-spend users — top 10
          </CardTitle>
          <CardDescription>
            VIP candidates — consider reaching out for premium upsell, testimonials, or retention.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {d.highSpendUsers.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No active subscriptions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Active subs</TableHead>
                    <TableHead className="text-right">Monthly USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.highSpendUsers.map((u) => (
                    <TableRow key={u.user.id}>
                      <TableCell className="font-medium">
                        {u.user.name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.user.email}</TableCell>
                      <TableCell>{u.user.country || "—"}</TableCell>
                      <TableCell>
                        {u.user.plan === "premium" ? (
                          <Badge variant="secondary">Premium</Badge>
                        ) : (
                          <Badge variant="outline">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{u.activeSubs}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtUsd(u.monthlyUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Churn risk */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Recent cancellations (last 7 days)
            </CardTitle>
            <CardDescription>
              Users who cancelled a subscription in the past week.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {d.churnRisk.recentCancellations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No cancellations in the last 7 days.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.churnRisk.recentCancellations.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">
                          <div className="font-medium">{c.user.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{c.user.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.provider}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.currency} {c.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {daysSince(c.updatedAt)}d ago
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Moon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Inactive users (30+ days)
            </CardTitle>
            <CardDescription>
              Users with no app activity for 30+ days. Re-engagement candidates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {d.inactiveUsers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No inactive users — everyone is engaged!</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Subs</TableHead>
                      <TableHead className="text-right">Inactive</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.inactiveUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-right">{u.activeSubs}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {daysSince(u.lastSeen)}d
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent signups */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Recent signups (last 24 hours)
          </CardTitle>
          <CardDescription>
            Welcome flow monitoring — see exactly who joined today.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {d.recentSignups.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No signups in the last 24 hours.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.recentSignups.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{u.country || "—"}</TableCell>
                      <TableCell>{u.currency || "USD"}</TableCell>
                      <TableCell>
                        {u.plan === "premium" ? (
                          <Badge variant="secondary">Premium</Badge>
                        ) : (
                          <Badge variant="outline">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
