import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { awardPoints, awardBadge, bumpChallenge, POINTS } from "@/lib/gamification";

// Redeem points for a reward tier (creates an unrevealed scratch card).
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rewardId } = await req.json();
  const reward = await db.reward.findUnique({ where: { id: rewardId } });
  if (!reward || !reward.active)
    return NextResponse.json({ error: "Reward not available" }, { status: 404 });

  const progress = await db.userProgress.findUnique({ where: { userId } });
  if (!progress || progress.points < reward.cost)
    return NextResponse.json({ error: "Not enough points" }, { status: 400 });

  // Deduct points + create the scratch card
  await db.userProgress.update({
    where: { userId },
    data: { points: { decrement: reward.cost } },
  });
  const redeemed = await db.redeemedReward.create({
    data: { userId, rewardId: reward.id, revealed: false },
    include: { reward: true },
  });

  // Small consolation points for engaging + badges + challenge
  await awardPoints(userId, POINTS.UNLOCK_REWARD);
  await awardBadge(userId, "deal_hunter");
  await bumpChallenge(userId, "🎁");

  return NextResponse.json({
    id: redeemed.id,
    rewardId: redeemed.rewardId,
    title: redeemed.reward.title,
    icon: redeemed.reward.icon,
    tier: redeemed.reward.tier,
    revealed: false,
  });
}
