import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { ensureUserProgress } from "@/lib/gamification";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUserProgress(userId);
  const rewards = await db.reward.findMany({
    where: { active: true },
    orderBy: { cost: "asc" },
  });
  const userProgress = await db.userProgress.findUnique({ where: { userId } });
  const points = userProgress?.points || 0;
  return NextResponse.json(
    rewards.map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      cost: r.cost,
      tier: r.tier,
      icon: r.icon,
      affordable: points >= r.cost,
    }))
  );
}
