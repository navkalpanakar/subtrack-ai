import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { awardPoints, awardBadge } from "@/lib/gamification";

// One free spin per day. Two-phase: POST = dry-spin (returns result without
// awarding), POST with ?claim=true = award the points. This lets the client
// animate the wheel BEFORE the points balance updates.
const WHEEL = [5, 10, 15, 20, 25, 50, 100, 200];

// In-memory store for pending dry-spins (survives hot reloads).
const g = globalThis as unknown as { __pendingSpins?: Map<string, { points: number; index: number; date: string }> };
const pending = g.__pendingSpins ?? new Map();
g.__pendingSpins = pending;

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const url = new URL(req.url);
  const claim = url.searchParams.get("claim") === "true";

  // Check if already spun today
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

  if (claim) {
    // Phase 2: claim the pending result (award points now)
    const pendingResult = pending.get(userId);
    if (!pendingResult || pendingResult.date !== today) {
      return NextResponse.json({ error: "No pending spin to claim" }, { status: 400 });
    }
    const { points: won, index: idx } = pendingResult;
    await db.spinResult.create({ data: { userId, points: won, date: today } });
    await awardPoints(userId, won);
    if (won >= 100) await awardBadge(userId, "deal_hunter");
    pending.delete(userId);
    return NextResponse.json({ spun: true, points: won, index: idx, claimed: true });
  }

  // Phase 1: dry-spin — compute the result WITHOUT awarding points yet.
  // If there's already a pending result for today, return it (idempotent).
  const alreadyPending = pending.get(userId);
  if (alreadyPending && alreadyPending.date === today) {
    return NextResponse.json({ spun: true, points: alreadyPending.points, index: alreadyPending.index, claimed: false });
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
  pending.set(userId, { points: won, index: idx, date: today });

  return NextResponse.json({ spun: true, points: won, index: idx, claimed: false });
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.spinResult.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  // Calculate when the next spin is available (midnight local time = next day)
  let nextSpinAt: string | null = null;
  if (existing) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    nextSpinAt = tomorrow.toISOString();
  }

  return NextResponse.json({
    canSpin: !existing,
    todayPoints: existing?.points || 0,
    nextSpinAt,
    wheel: WHEEL,
  });
}
