"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, CalendarClock, Wallet, AlertTriangle, ChevronRight } from "lucide-react";
import { useSubscriptions, useDeleteSubscription, type Subscription } from "@/hooks/use-subscriptions";
import { useUI } from "@/hooks/use-ui";
import { SubscriptionCard } from "@/components/subscription-card";
import { formatCurrency, yearlyEquivalent, monthlyEquivalent, daysUntil, relativeRenewal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardView() {
  const { data: subs, isLoading } = useSubscriptions();
  const deleteSub = useDeleteSubscription();
  const { setTab, setQuickAddOpen } = useUI();

  const stats = useMemo(() => {
    if (!subs) return { monthly: 0, yearly: 0, active: 0, upcoming: [] as Subscription[] };
    const active = subs.filter((s) => s.status === "active");
    const monthly = active.reduce((sum, s) => sum + monthlyEquivalent(Number(s.amount), s.billingCycle), 0);
    const yearly = active.reduce((sum, s) => sum + yearlyEquivalent(Number(s.amount), s.billingCycle), 0);
    const upcoming = [...active]
      .sort((a, b) => daysUntil(a.nextBillingDate) - daysUntil(b.nextBillingDate))
      .slice(0, 4);
    return { monthly, yearly, active: active.length, upcoming };
  }, [subs]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!subs || subs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-semibold text-lg">No subscriptions yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
          Add your first subscription with AI — type, scan a receipt, or sync your email.
        </p>
        <Button className="mt-5" onClick={() => setQuickAddOpen(true)}>
          Add subscription
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero spend card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 shadow-xl shadow-primary/20"
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -right-4 bottom-0 h-20 w-20 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
            Monthly spend
          </p>
          <p className="text-4xl font-bold tracking-tight mt-1">
            {formatCurrency(stats.monthly)}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div>
              <p className="text-[11px] text-primary-foreground/70">Per year</p>
              <p className="text-sm font-semibold">{formatCurrency(stats.yearly)}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-[11px] text-primary-foreground/70">Active</p>
              <p className="text-sm font-semibold">{stats.active} subs</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={CalendarClock}
          label="Next renewal"
          value={stats.upcoming[0] ? relativeRenewal(stats.upcoming[0].nextBillingDate) : "—"}
          sub={stats.upcoming[0]?.name || "Nothing due"}
          onClick={() => setTab("subs")}
        />
        <StatTile
          icon={TrendingDown}
          label="Potential savings"
          value="See AI"
          sub="Tap to view insights"
          accent
          onClick={() => setTab("insights")}
        />
      </div>

      {/* Upcoming renewals */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="font-semibold text-sm flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-primary" />
            Upcoming renewals
          </h2>
          <button
            onClick={() => setTab("subs")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center"
          >
            All <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {stats.upcoming.map((s) => {
            const days = daysUntil(s.nextBillingDate);
            const urgent = days <= 3;
            return (
              <div key={s.id} className={urgent ? "ring-1 ring-amber-500/40 rounded-2xl" : ""}>
                <SubscriptionCard
                  sub={s}
                  onDelete={(id) => deleteSub.mutate(id)}
                />
                {urgent && (
                  <div className="px-3 pb-1 -mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Renews soon — consider cancelling
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category breakdown */}
      <CategoryBreakdown subs={subs} />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass rounded-2xl p-4 text-left active:scale-[0.98] transition ${
        accent ? "ring-1 ring-primary/30" : ""
      }`}
    >
      <Icon className={`h-5 w-5 mb-2 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-bold text-base mt-0.5">{value}</p>
      <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
    </button>
  );
}

function CategoryBreakdown({ subs }: { subs: Subscription[] }) {
  const cats = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of subs) {
      if (s.status !== "active") continue;
      const m = monthlyEquivalent(Number(s.amount), s.billingCycle);
      map.set(s.category, (map.get(s.category) || 0) + m);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [subs]);

  const total = cats.reduce((sum, [, v]) => sum + v, 0) || 1;

  return (
    <div className="glass rounded-2xl p-4">
      <h2 className="font-semibold text-sm mb-3">Spending by category</h2>
      <div className="space-y-2.5">
        {cats.map(([cat, val]) => {
          const pct = Math.round((val / total) * 100);
          return (
            <div key={cat}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{cat}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(val)} · {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
