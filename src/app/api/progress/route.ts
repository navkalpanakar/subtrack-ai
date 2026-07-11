import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { getLevelInfo, ensureUserProgress } from "@/lib/gamification";
import { savingsMilestoneAmount, formatMoney } from "@/lib/currency";

// Returns the user's full gamification state: points, level, streak,
// check-in availability, challenges, redeemed rewards, badges.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUserProgress(userId);
  const progress = await db.userProgress.findUnique({ where: { userId } });
  if (!progress) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch the user's currency so savings + badge details are localized
  const me = await db.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const userCurrency = me?.currency || "USD";

  const level = getLevelInfo(progress.points);
  const last = progress.lastCheckIn;
  const now = new Date();
  const canCheckIn = !last || dayDiff(now, last) !== 0;

  const [challenges, rewards, badges] = await Promise.all([
    db.userChallenge.findMany({
      where: { userId },
      include: { challenge: true },
    }),
    db.redeemedReward.findMany({
      where: { userId },
      include: { reward: true },
      orderBy: { redeemedAt: "desc" },
    }),
    db.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    points: progress.points,
    level,
    streak: progress.streak,
    canCheckIn,
    savingsGoal: progress.savingsGoal,
    totalSaved: progress.totalSaved,
    currency: userCurrency,
    challenges: challenges.map((c) => ({
      id: c.challenge.id,
      title: c.challenge.title,
      detail: c.challenge.detail,
      icon: c.challenge.icon,
      points: c.challenge.points,
      goal: c.challenge.goal,
      progress: c.progress,
      completed: c.completed,
    })),
    redeemedRewards: rewards.map((r) => ({
      id: r.id,
      rewardId: r.rewardId,
      title: r.reward.title,
      icon: r.reward.icon,
      tier: r.reward.tier,
      revealed: r.revealed,
      offerTitle: r.offerTitle,
      offerUrl: r.offerUrl,
      offerDetail: r.offerDetail,
      redeemedAt: r.redeemedAt,
    })),
    badges: badges.map((b) => ({
      key: b.badge.key,
      title: b.badge.title,
      // Localize the savings milestone badge detail per user currency
      detail: b.badge.key === "savings_100"
        ? `Saved ${formatMoney(savingsMilestoneAmount(userCurrency), userCurrency)} total`
        : b.badge.detail,
      icon: b.badge.icon,
      earnedAt: b.earnedAt,
    })),
  });
}

function dayDiff(a: Date, b: Date): number {
  const da = new Date(a);
  const dbb = new Date(b);
  da.setHours(0, 0, 0, 0);
  dbb.setHours(0, 0, 0, 0);
  return Math.round((da.getTime() - dbb.getTime()) / 86400000);
}
