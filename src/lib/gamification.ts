// Gamification engine for SubTrack AI.
// Defines points rules, level thresholds, streak logic, challenges,
// badges, and the reward tiers. All point-awarding goes through awardPoints().

import { db } from "./db";

// ─── Points rules ──────────────────────────────────────────────
export const POINTS = {
  ADD_SUBSCRIPTION: 10,
  CANCEL_SUBSCRIPTION: 50,
  VIEW_INSIGHTS: 5,
  DAILY_CHECK_IN: 5,
  STREAK_BONUS_7: 50,
  UNLOCK_REWARD: 15,
  COMPLETE_CHALLENGE: 0, // dynamic — comes from the challenge
} as const;

// ─── Levels ────────────────────────────────────────────────────
export type LevelInfo = {
  level: number;
  title: string;
  icon: string;
  minPoints: number;
  nextLevelPoints: number | null;
  progress: number; // 0-100 toward next level
};

const LEVELS = [
  { title: "Rookie", icon: "🌱", minPoints: 0 },
  { title: "Saver", icon: "⭐", minPoints: 100 },
  { title: "Pro", icon: "🏆", minPoints: 500 },
  { title: "Master", icon: "💎", minPoints: 1500 },
  { title: "Legend", icon: "👑", minPoints: 4000 },
];

export function getLevelInfo(points: number): LevelInfo {
  let current = LEVELS[0];
  let next: (typeof LEVELS)[number] | null = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].minPoints) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  const levelIdx = LEVELS.indexOf(current);
  let progress = 100;
  if (next) {
    const span = next.minPoints - current.minPoints;
    const got = points - current.minPoints;
    progress = Math.min(100, Math.round((got / span) * 100));
  }
  return {
    level: levelIdx + 1,
    title: current.title,
    icon: current.icon,
    minPoints: current.minPoints,
    nextLevelPoints: next ? next.minPoints : null,
    progress,
  };
}

// ─── Badges ────────────────────────────────────────────────────
export const BADGES = [
  { key: "first_subscription", title: "First Steps", detail: "Added your first subscription", icon: "👣" },
  { key: "streak_3", title: "Streak Starter", detail: "Checked in 3 days in a row", icon: "🔥" },
  { key: "first_cancel", title: "Money Saver", detail: "Cancelled your first subscription", icon: "✂️" },
  { key: "curious", title: "Curious Mind", detail: "Reviewed AI insights", icon: "🧠" },
  { key: "deal_hunter", title: "Deal Hunter", detail: "Unlocked your first reward", icon: "🎁" },
  { key: "streak_7", title: "Week Warrior", detail: "7-day check-in streak", icon: "⚡" },
  { key: "level_pro", title: "Savvy Pro", detail: "Reached Pro level", icon: "🏆" },
  { key: "savings_100", title: "Centurion", detail: "Saved $100 total", icon: "💯" },
] as const;

export async function awardBadge(userId: string, key: string) {
  const existing = await db.userBadge.findFirst({
    where: { userId, badge: { key } },
  });
  if (existing) return false;
  const badge = await db.badge.findUnique({ where: { key } });
  if (!badge) return false;
  await db.userBadge.create({ data: { userId, badgeId: badge.id } });
  return true; // newly awarded
}

// ─── Core: award points + auto-level + badge checks ────────────
export async function awardPoints(userId: string, amount: number) {
  if (amount <= 0) return null;
  const progress = await db.userProgress.upsert({
    where: { userId },
    update: { points: { increment: amount } },
    create: { userId, points: amount },
  });
  const info = getLevelInfo(progress.points);
  await db.userProgress.update({
    where: { userId },
    data: { level: info.level },
  });
  // Auto-award level badge
  if (info.level >= 3) await awardBadge(userId, "level_pro");
  return { points: progress.points, info };
}

// ─── Streak logic ──────────────────────────────────────────────
export function dayDiff(a: Date, b: Date): number {
  const da = new Date(a);
  const db = new Date(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.round((da.getTime() - db.getTime()) / 86400000);
}

export async function dailyCheckIn(userId: string) {
  const progress = await db.userProgress.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  const now = new Date();
  const last = progress.lastCheckIn;
  let newStreak = 1;
  let alreadyCheckedIn = false;
  if (last) {
    const diff = dayDiff(now, last);
    if (diff === 0) {
      alreadyCheckedIn = true;
      newStreak = progress.streak;
    } else if (diff === 1) {
      newStreak = progress.streak + 1;
    } else {
      newStreak = 1; // streak broken
    }
  }
  if (alreadyCheckedIn) {
    return { checkedIn: false, streak: progress.streak, points: progress.points };
  }
  const bonus = newStreak % 7 === 0 ? POINTS.STREAK_BONUS_7 : 0;
  const earned = POINTS.DAILY_CHECK_IN + bonus;
  const updated = await db.userProgress.update({
    where: { userId },
    data: { streak: newStreak, lastCheckIn: now, points: { increment: earned } },
  });
  // Streak badges
  if (newStreak >= 3) await awardBadge(userId, "streak_3");
  if (newStreak >= 7) await awardBadge(userId, "streak_7");
  return { checkedIn: true, streak: newStreak, points: updated.points, earned };
}

// ─── Challenges (seeded) ───────────────────────────────────────
export const SEED_CHALLENGES = [
  { title: "Cancel 1 subscription", detail: "Cut a subscription you no longer use.", points: 100, goal: 1, icon: "✂️" },
  { title: "Add 3 subscriptions", detail: "Track at least 3 subscriptions to build your dashboard.", points: 30, goal: 3, icon: "➕" },
  { title: "Review AI insights", detail: "Let Savvy analyze your spending once.", points: 20, goal: 1, icon: "🧠" },
  { title: "Unlock 1 reward", detail: "Scratch a reward card to reveal a deal.", points: 25, goal: 1, icon: "🎁" },
  { title: "Check in 3 days", detail: "Open SubTrack AI 3 days to build your streak.", points: 40, goal: 3, icon: "🔥" },
];

export async function ensureChallengesSeeded() {
  const count = await db.challenge.count();
  if (count === 0) {
    for (const c of SEED_CHALLENGES) {
      await db.challenge.create({ data: { ...c, active: true } });
    }
  }
  if ((await db.badge.count()) === 0) {
    for (const b of BADGES) {
      await db.badge.create({ data: { key: b.key, title: b.title, detail: b.detail, icon: b.icon } });
    }
  }
}

// ─── Challenge progress ────────────────────────────────────────
export async function bumpChallenge(userId: string, icon: string, amount = 1) {
  const challenge = await db.challenge.findFirst({ where: { icon, active: true } });
  if (!challenge) return null;
  const uc = await db.userChallenge.upsert({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
    update: {},
    create: { userId, challengeId: challenge.id },
  });
  if (uc.completed) return null;
  const newProgress = Math.min(challenge.goal, uc.progress + amount);
  const completed = newProgress >= challenge.goal;
  await db.userChallenge.update({
    where: { id: uc.id },
    data: {
      progress: newProgress,
      completed,
      completedAt: completed ? new Date() : null,
    },
  });
  if (completed) {
    await awardPoints(userId, challenge.points);
  }
  return { completed, points: challenge.points };
}

// ─── Reward tiers (scratch cards) ──────────────────────────────
export const SEED_REWARDS = [
  { title: "Mystery Deal", detail: "Scratch to reveal a live offer from your providers", cost: 50, tier: "bronze", icon: "🎴" },
  { title: "Premium Offer", detail: "A hand-picked premium discount", cost: 150, tier: "silver", icon: "✨" },
  { title: "Savvy Exclusive", detail: "An exclusive AI-negotiated deal", cost: 300, tier: "gold", icon: "👑" },
];

export async function ensureRewardsSeeded() {
  const count = await db.reward.count();
  if (count === 0) {
    for (const r of SEED_REWARDS) {
      await db.reward.create({ data: { ...r, active: true } });
    }
  }
}

// Initialize on first user
export async function ensureUserProgress(userId: string) {
  await ensureChallengesSeeded();
  await ensureRewardsSeeded();
  // Get the user's currency to set a meaningful savings goal
  const user = await db.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const currency = user?.currency || "USD";
  const SAVINGS_GOALS: Record<string, number> = {
    INR: 5000, USD: 100, GBP: 75, EUR: 80, AUD: 150, CAD: 130,
    JPY: 15000, KRW: 150000, CNY: 700, SGD: 150, AED: 400, BRL: 500,
  };
  const goal = SAVINGS_GOALS[currency] || 100;
  await db.userProgress.upsert({
    where: { userId },
    update: {},
    create: { userId, savingsGoal: goal },
  });
}
