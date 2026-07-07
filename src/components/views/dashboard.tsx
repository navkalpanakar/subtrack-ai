"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingDown, CalendarClock, Wallet, AlertTriangle, ChevronRight,
  Flame, Trophy, Target, Sparkles,
} from "@/components/icons";
import { useSubscriptions, useDeleteSubscription, type Subscription } from "@/hooks/use-subscriptions";
import { useUI } from "@/hooks/use-ui";
import { useProgress } from "@/hooks/use-gamification";
import { SubscriptionCard } from "@/components/subscription-card";
import { SavvyMascot } from "@/components/savvy-mascot";
import { formatCurrency, yearlyEquivalent, monthlyEquivalent, daysUntil, relativeRenewal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SAVVY_TIPS = [
  "I noticed 3 streaming subs — consider sharing a family plan to save up to 40%.",
  "Your Adobe renewal is in 3 weeks. Cancel now to avoid the next $59.99 charge.",
  "You're paying yearly for Prime — that's $12/mo equivalent. Smart choice!",
  "ChatGPT Plus renews soon. Want me to find a student or annual discount?",
  "Three of your apps overlap on music. Cutting one saves ~$120/yr.",
];

export function DashboardView() {
  const { data: subs, isLoading } = useSubscriptions();
  const { data: progress } = useProgress();
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

  const tipOfTheDay = useMemo(() => {
    const idx = new Date().getDate() % SAVVY_TIPS.length;
    return SAVVY_TIPS[idx];
  }, []);

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
      <div className="text-center py-12">
        <SavvyMascot size={88} variant="happy" className="mx-auto mb-3" />
        <h2 className="font-semibold text-lg">Let's get tracking!</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
          Add your first subscription and Savvy will start finding savings.
          You'll earn <span className="font-semibold text-primary">10 points</span> instantly.
        </p>
        <Button className="mt-5" onClick={() => setQuickAddOpen(true)}>
          <Sparkles className="h-4 w-4 mr-1" /> Add your first subscription
        </Button>
      </div>
    );
  }

  const savingsPct = progress
    ? Math.min(100, Math.round((progress.totalSaved / progress.savingsGoal) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Gamification header strip */}
      {progress && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-3 flex items-center gap-3"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">{progress.points}</span>
            <span className="text-[10px] text-muted-foreground">pts</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10">
            <Flame className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold">{progress.streak}</span>
            <span className="text-[10px] text-muted-foreground">day</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-chart-4/10">
            <span className="text-base">{progress.level.icon}</span>
            <span className="text-xs font-semibold">{progress.level.title}</span>
          </div>
          <button
            onClick={() => setTab("rewards")}
            className="ml-auto text-xs text-primary font-medium flex items-center gap-0.5"
          >
            Rewards <ChevronRight className="h-3 w-3" />
          </button>
        </motion.div>
      )}

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
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-[11px] text-primary-foreground/70">Saved</p>
              <p className="text-sm font-semibold">{formatCurrency(progress?.totalSaved || 0)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Savvy tip of the day */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 flex items-start gap-3"
      >
        <SavvyMascot size={44} variant="wink" className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-primary">Savvy says</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">AI TIP</span>
          </div>
          <p className="text-sm leading-relaxed">{tipOfTheDay}</p>
          <button
            onClick={() => setTab("insights")}
            className="text-xs text-primary font-medium mt-1.5 flex items-center gap-0.5"
          >
            See full analysis <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </motion.div>

      {/* Savings goal progress */}
      {progress && progress.totalSaved > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary" />
              Savings goal
            </h3>
            <span className="text-xs text-muted-foreground">
              {formatCurrency(progress.totalSaved)} / {formatCurrency(progress.savingsGoal)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${savingsPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {savingsPct >= 100
              ? "🎉 Goal smashed! You're a savings legend."
              : `${100 - savingsPct}% to go — cancel one more sub to push further.`}
          </p>
        </div>
      )}

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
                <SubscriptionCard sub={s} onDelete={(id) => deleteSub.mutate(id)} />
                {urgent && (
                  <div className="px-3 pb-1 -mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Renews soon — cancel to earn <span className="font-semibold">+50 points</span>
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
  icon: Icon, label, value, sub, accent, onClick,
}: {
  icon: typeof Wallet; label: string; value: string; sub: string; accent?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass rounded-2xl p-4 text-left active:scale-[0.98] transition ${accent ? "ring-1 ring-primary/30" : ""}`}
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
                <span className="text-muted-foreground">{formatCurrency(val)} · {pct}%</span>
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
