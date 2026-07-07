import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { awardPoints, awardBadge } from "@/lib/gamification";

// One free spin per day. Returns the points won.
const WHEEL = [5, 10, 15, 20, 25, 50, 100, 200];

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.spinResult.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (existing) {
    return NextResponse.json({
      spun: false,
      message: "Already spun today — come back tomorrow!",
      points: existing.points,
    });
  }

  // Weighted random: lower points = higher probability
  const weights = [30, 25, 15, 12, 8, 6, 3, 1];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let idx = 0;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { idx = i; break; }
  }
  const won = WHEEL[idx];

  await db.spinResult.create({ data: { userId, points: won, date: today } });
  await awardPoints(userId, won);
  // Bonus badge for big win
  if (won >= 100) await awardBadge(userId, "deal_hunter");

  return NextResponse.json({ spun: true, points: won, index: idx });
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.spinResult.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  return NextResponse.json({
    canSpin: !existing,
    todayPoints: existing?.points || 0,
    wheel: WHEEL,
  });
}
