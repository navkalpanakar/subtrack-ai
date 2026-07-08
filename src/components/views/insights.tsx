"use client";

import { motion } from "framer-motion";
import {
  Lightbulb, TrendingDown, AlertTriangle, Sparkles, Layers, RefreshCw, ChevronRight, type LucideIcon,
} from "@/components/icons";
import { useInsights, useSubscriptions, type Insight } from "@/hooks/use-subscriptions";
import { useProgress } from "@/hooks/use-gamification";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SavvyMascot } from "@/components/savvy-mascot";
import { monthlyEquivalent } from "@/lib/format";
import { useFormatCurrency, useCurrencyStore } from "@/hooks/use-currency-store";

const TYPE_META: Record<Insight["type"], { icon: LucideIcon; color: string; bg: string; label: string }> = {
  saving: { icon: TrendingDown, color: "text-primary", bg: "bg-primary/10", label: "Savings" },
  alert: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", label: "Alert" },
  tip: { icon: Sparkles, color: "text-chart-4", bg: "bg-chart-4/10", label: "Tip" },
  overlap: { icon: Layers, color: "text-chart-3", bg: "bg-chart-3/10", label: "Overlap" },
};

export function InsightsView() {
  const { currency } = useCurrencyStore();
  const { data: insights, isLoading, refetch, isFetching } = useInsights(currency);
  const { data: subs } = useSubscriptions();
  const { data: progress } = useProgress();
  const fmt = useFormatCurrency();

  // Show the BEST single saving opportunity, not the sum — insights are
  // alternative options (the user picks one, not all). E.g., "switch to
  // annual" OR "find a student discount" — not both.
  const totalSavings = (insights || []).reduce(
    (max, i) => Math.max(max, i.potentialSaving || 0),
    0
  );
  const totalMonthly = (subs || [])
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + monthlyEquivalent(Number(s.amount), s.billingCycle), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Savvy Insights
          </h1>
          <p className="text-xs text-muted-foreground">AI analysis of your subscriptions</p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Savvy intro card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 flex items-start gap-3"
      >
        <SavvyMascot size={48} variant="happy" className="shrink-0" />
        <div>
          <p className="text-sm leading-relaxed">
            <span className="font-bold text-primary">Hi, I'm Savvy.</span>{" "}
            {isLoading
              ? "Analyzing your subscriptions…"
              : insights && insights.length > 0
              ? "Here's what I found — tap any insight to act on it."
              : "Add a few subscriptions and I'll find personalized savings."}
          </p>
          {progress && (
            <p className="text-[11px] text-muted-foreground mt-1">
              You've earned {progress.points} points exploring insights. Keep going!
            </p>
          )}
        </div>
      </motion.div>

      {/* Savings opportunity banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-4"
      >
        <p className="text-xs text-muted-foreground">Best saving opportunity</p>
        <p className="text-3xl font-bold text-primary mt-0.5">{fmt(totalSavings)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {totalSavings > 0
            ? totalMonthly > 0
              ? `Up to ${Math.round((totalSavings / totalMonthly) * 100)}% of your ${fmt(totalMonthly)}/mo spend — pick one option below`
              : "Pick one option below to start saving"
            : "Add subscriptions to see personalized savings"}
        </p>
      </motion.div>

      {/* Insights list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : !insights || insights.length === 0 ? (
        <div className="text-center py-12">
          <SavvyMascot size={72} variant="idle" className="mx-auto mb-3 opacity-60" />
          <p className="text-sm text-muted-foreground">No insights yet. Add subscriptions to unlock AI savings tips.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const meta = TYPE_META[insight.type] || TYPE_META.tip;
            const Icon = meta.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                      {insight.potentialSaving ? (
                        <span className="text-[10px] font-bold text-primary">{fmt(insight.potentialSaving)}/mo</span>
                      ) : null}
                    </div>
                    <h3 className="font-semibold text-sm">{insight.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.detail}</p>
                    {insight.provider && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        About <span className="font-medium text-foreground">{insight.provider}</span>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center px-4">
        Insights are generated by Savvy AI from your subscription data. Always verify before cancelling.
      </p>
    </div>
  );
}
