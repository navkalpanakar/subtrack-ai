"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, TrendingDown, AlertTriangle, Sparkles, Layers, RefreshCw, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useInsights, useSubscriptions, type Insight } from "@/hooks/use-subscriptions";
import { useProgress } from "@/hooks/use-gamification";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SavvyMascot } from "@/components/savvy-mascot";
import { monthlyEquivalent } from "@/lib/format";
import { useFormatCurrency, useCurrencyStore } from "@/hooks/use-currency-store";
import { toast } from "sonner";

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
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);

  const handleAct = (insight: Insight, action: string) => {
    const provider = insight.provider || "the subscription";
    switch (action) {
      case "find_annual":
        window.open(`https://www.google.com/search?q=${encodeURIComponent(provider + " annual subscription plan price " + currency)}`, "_blank");
        toast.success(`Searching for ${provider} annual plans…`);
        break;
      case "find_student":
        window.open(`https://www.google.com/search?q=${encodeURIComponent(provider + " student discount education pricing")}`, "_blank");
        toast.success(`Searching for ${provider} student discounts…`);
        break;
      case "find_alternative":
        window.open(`https://www.google.com/search?q=${encodeURIComponent("cheaper alternatives to " + provider + " subscription")}`, "_blank");
        toast.success(`Searching for cheaper alternatives to ${provider}…`);
        break;
      case "downgrade":
        window.open(`https://www.google.com/search?q=${encodeURIComponent(provider + " downgrade plan cheaper tier")}`, "_blank");
        toast.success(`Searching for ${provider} cheaper plans…`);
        break;
      case "search_offer":
        window.open(`https://www.google.com/search?q=${encodeURIComponent(provider + " promo code discount deal " + new Date().getFullYear())}`, "_blank");
        toast.success(`Searching for ${provider} promo codes…`);
        break;
      case "cancel":
        const sub = subs?.find((s) => s.provider === insight.provider || s.name === insight.provider);
        if (sub?.cancelUrl) {
          window.open(sub.cancelUrl, "_blank");
          toast.success(`Opening ${provider} cancel page…`);
        } else {
          window.open(`https://www.google.com/search?q=${encodeURIComponent("how to cancel " + provider + " subscription")}`, "_blank");
          toast.success(`Searching for how to cancel ${provider}…`);
        }
        break;
    }
    setActiveInsight(null);
  };

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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-6 text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mx-auto w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary"
          />
          <div>
            <h3 className="font-semibold text-sm">Savvy is analyzing your subscriptions…</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Fetching live web prices and generating personalized insights.
              This can take <span className="font-semibold text-foreground">2-5 minutes</span> based on your subscriptions.
            </p>
          </div>
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 text-left">
            <p className="text-[11px] font-medium text-primary mb-1.5">Meanwhile, explore:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-base">🎁</span>
                <span><strong>Rewards tab</strong> — spin the wheel, unlock scratch cards, check the leaderboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-base">📊</span>
                <span><strong>Subs tab</strong> — review your subscriptions, edit prices, manage cancellations</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-base">👤</span>
                <span><strong>Profile</strong> — set your occupation for curated student/corporate discounts</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Come back to this tab in a few minutes — your insights will be ready.
          </p>
        </motion.div>
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
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveInsight(insight)}
                className="glass rounded-2xl p-4 w-full text-left active:scale-[0.99] transition"
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
                    {insight.action && (
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                        Tap to act <ChevronRight className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Action sheet — opens when tapping an insight */}
      <AnimatePresence>
        {activeInsight && (
          <ActionSheet
            insight={activeInsight}
            onClose={() => setActiveInsight(null)}
            onAct={(action) => handleAct(activeInsight, action)}
          />
        )}
      </AnimatePresence>

      <p className="text-[11px] text-muted-foreground text-center px-4">
        Insights use live web prices + your profile for curated suggestions. Always verify before cancelling.
      </p>
    </div>
  );
}

// ─── Action sheet — opens when tapping an insight ───────────────
function ActionSheet({
  insight,
  onClose,
  onAct,
}: {
  insight: Insight;
  onClose: () => void;
  onAct: (action: string) => void;
}) {
  const actions: Array<{ key: string; label: string; desc: string }> = [
    { key: "find_annual", label: "📅 Find annual plan", desc: "Search for yearly billing discounts" },
    { key: "find_student", label: "🎓 Student discount", desc: "Check for education pricing" },
    { key: "search_offer", label: "🏷️ Find promo codes", desc: "Search for current deals & coupons" },
    { key: "downgrade", label: "⬇️ Downgrade plan", desc: "Find a cheaper tier" },
    { key: "find_alternative", label: "🔄 Find alternatives", desc: "Search for cheaper substitutes" },
    { key: "cancel", label: "✂️ Cancel subscription", desc: "Go to the cancel page" },
  ];

  // If the insight has a specific action, put it first
  const sortedActions = insight.action
    ? [actions.find((a) => a.key === insight.action)!, ...actions.filter((a) => a.key !== insight.action)]
    : actions;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      />
      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 inset-x-0 z-50 glass-nav rounded-t-3xl p-4 pb-8 max-w-md mx-auto"
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3" />
        <h3 className="font-semibold text-sm mb-1">{insight.title}</h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{insight.detail}</p>
        <div className="space-y-2">
          {sortedActions.map((a) => (
            <button
              key={a.key}
              onClick={() => onAct(a.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition active:scale-[0.98] text-left ${
                a.key === insight.action
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-card hover:bg-accent border border-border"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-[11px] text-muted-foreground">{a.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground py-2"
        >
          Close
        </button>
      </motion.div>
    </>
  );
}
