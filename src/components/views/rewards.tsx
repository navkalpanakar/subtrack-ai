"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Flame, Gift, Target, Lock, Check, Star, Award, Zap, Sparkles, Loader2,
} from "@/components/icons";
import { useProgress, useRewardTiers, useRedeemReward, useCheckIn } from "@/hooks/use-gamification";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import { ScratchCard } from "@/components/scratch-card";
import { SavvyMascot } from "@/components/savvy-mascot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TIER_STYLES: Record<string, { gradient: string; label: string }> = {
  bronze: { gradient: "from-orange-400 to-amber-700", label: "Bronze" },
  silver: { gradient: "from-slate-300 to-slate-500", label: "Silver" },
  gold: { gradient: "from-amber-400 to-yellow-600", label: "Gold" },
};

export function RewardsView() {
  const { data: progress, isLoading } = useProgress();
  const { data: rewardTiers } = useRewardTiers();
  const { data: subs } = useSubscriptions();
  const redeem = useRedeemReward();
  const checkIn = useCheckIn();

  const providers = useMemo(() => {
    if (!subs) return [];
    const set = new Map<string, string>();
    for (const s of subs) set.set(s.provider, s.name);
    return [...set.keys()];
  }, [subs]);

  if (isLoading || !progress) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  const { level } = progress;
  const scratchCards = progress.redeemedRewards;
  const completedChallenges = progress.challenges.filter((c) => c.completed).length;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Rewards
        </h1>
        <p className="text-xs text-muted-foreground">Earn points, complete challenges, unlock coupons</p>
      </div>

      {/* Level + points hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 shadow-xl shadow-primary/20"
      >
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center text-4xl shrink-0">
            {level.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary-foreground/70 uppercase tracking-wide">Level {level.level} · {level.title}</p>
            <p className="text-3xl font-bold">{progress.points} <span className="text-base font-medium text-primary-foreground/80">pts</span></p>
            {level.nextLevelPoints !== null ? (
              <p className="text-[11px] text-primary-foreground/80">{level.nextLevelPoints - progress.points} pts to {level.title === "Rookie" ? "Saver" : "next level"}</p>
            ) : (
              <p className="text-[11px] text-primary-foreground/80">Max level — you're a legend 👑</p>
            )}
          </div>
        </div>
        {/* Level progress bar */}
        <div className="relative mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${level.progress}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </motion.div>

      {/* Daily check-in + streak */}
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <Flame className="h-6 w-6 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{progress.streak}-day streak 🔥</p>
          <p className="text-[11px] text-muted-foreground">
            {progress.canCheckIn ? "Check in today for +5 points (7-day bonus: +50!)" : "Checked in today — see you tomorrow!"}
          </p>
        </div>
        <Button
          size="sm"
          disabled={!progress.canCheckIn || checkIn.isPending}
          onClick={() => checkIn.mutate()}
          className="rounded-full"
        >
          {checkIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : progress.canCheckIn ? "Check in" : <Check className="h-4 w-4" />}
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <Trophy className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{progress.points}</p>
          <p className="text-[10px] text-muted-foreground">Points</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Target className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{completedChallenges}/{progress.challenges.length}</p>
          <p className="text-[10px] text-muted-foreground">Quests</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Award className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{progress.badges.length}</p>
          <p className="text-[10px] text-muted-foreground">Badges</p>
        </div>
      </div>

      {/* Scratch cards to reveal */}
      {scratchCards.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-2 px-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            Your scratch cards ({scratchCards.filter((c) => !c.revealed).length} to reveal)
          </h2>
          <div className="space-y-3">
            {scratchCards.slice(0, 4).map((card) => (
              <ScratchCard
                key={card.id}
                reward={card}
                providerHint={providers[Math.floor(Math.random() * Math.max(1, providers.length))]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unlock new rewards */}
      <div>
        <h2 className="font-semibold text-sm mb-2 px-1 flex items-center gap-1.5">
          <Gift className="h-4 w-4 text-primary" />
          Unlock a reward
        </h2>
        <div className="space-y-2">
          {(rewardTiers || []).map((tier) => {
            const style = TIER_STYLES[tier.tier] || TIER_STYLES.bronze;
            const canAfford = tier.affordable;
            return (
              <div key={tier.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center text-2xl shrink-0`}>
                  {tier.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{tier.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{tier.detail}</p>
                  <p className={`text-xs font-bold mt-0.5 ${canAfford ? "text-primary" : "text-muted-foreground"}`}>
                    {tier.cost} pts {canAfford ? "" : `(${tier.cost - progress.points} more)`}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!canAfford || redeem.isPending}
                  onClick={() => redeem.mutate(tier.id)}
                  className="rounded-full shrink-0"
                >
                  {canAfford ? (
                    <>Unlock</>
                  ) : (
                    <><Lock className="h-3.5 w-3.5 mr-1" /> Locked</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Challenges */}
      <div>
        <h2 className="font-semibold text-sm mb-2 px-1 flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" />
          Quests
        </h2>
        <div className="space-y-2">
          {progress.challenges.map((c) => {
            const pct = Math.round((c.progress / c.goal) * 100);
            return (
              <div key={c.id} className="glass rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1">
                      {c.title}
                      {c.completed && <Check className="h-3.5 w-3.5 text-primary" />}
                    </p>
                    <p className="text-[11px] text-muted-foreground">+{c.points} pts</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{c.progress}/{c.goal}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className={`h-full rounded-full ${c.completed ? "bg-primary" : "bg-amber-400"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="font-semibold text-sm mb-2 px-1 flex items-center gap-1.5">
          <Award className="h-4 w-4 text-primary" />
          Badges ({progress.badges.length})
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {/* All possible badges, with earned ones colored and unearned greyed */}
          {ALL_BADGE_SLOTS.map((slot) => {
            const earned = progress.badges.find((b) => b.key === slot.key);
            return (
              <div
                key={slot.key}
                className={`glass rounded-xl p-2.5 text-center ${earned ? "" : "opacity-30"}`}
                title={earned ? `${slot.title}: ${slot.detail}` : "Locked badge"}
              >
                <div className="text-2xl mb-0.5">{earned ? slot.icon : "🔒"}</div>
                <p className="text-[9px] font-medium leading-tight">{slot.title}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savvy encouragement */}
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <SavvyMascot size={44} variant="excited" className="shrink-0" />
        <p className="text-xs leading-relaxed">
          <span className="font-bold text-primary">Savvy:</span> Every point you earn brings real
          coupons within reach. Cancel one unused sub and you'll jump a level!
        </p>
      </div>
    </div>
  );
}

const ALL_BADGE_SLOTS = [
  { key: "first_subscription", title: "First Steps", icon: "👣" },
  { key: "streak_3", title: "Streak Starter", icon: "🔥" },
  { key: "first_cancel", title: "Money Saver", icon: "✂️" },
  { key: "curious", title: "Curious Mind", icon: "🧠" },
  { key: "deal_hunter", title: "Deal Hunter", icon: "🎁" },
  { key: "streak_7", title: "Week Warrior", icon: "⚡" },
  { key: "level_pro", title: "Savvy Pro", icon: "🏆" },
  { key: "savings_100", title: "Centurion", icon: "💯" },
];
