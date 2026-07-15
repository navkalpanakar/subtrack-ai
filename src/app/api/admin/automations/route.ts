import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

// GET /api/admin/automations → automated alerts
//
// Returns:
//   highSpendUsers    — top 10 users by monthly USD spend
//   inactiveUsers     — users with no activity in 30+ days (updatedAt)
//   churnRisk         — users with 0 active subs OR cancelled a sub in last 7 days
//   recentSignups     — users who joined in last 24 hours

const FX_TO_USD: Record<string, number> = {
  USD: 1, INR: 0.012, EUR: 1.08, GBP: 1.27, JPY: 0.0067,
  AUD: 0.66, CAD: 0.74, SGD: 0.74, AED: 0.27, BRL: 0.2,
  CHF: 1.13, CNY: 0.14, ZAR: 0.054, MXN: 0.06,
};

function monthlyUsd(amount: number, currency: string, cycle: string): number {
  const usd = amount * (FX_TO_USD[currency.toUpperCase()] ?? 1);
  if (cycle === "yearly" || cycle === "annual") return usd / 12;
  if (cycle === "weekly") return (usd / 7) * 30;
  if (cycle === "quarterly") return usd / 3;
  if (cycle === "daily") return usd * 30;
  return usd;
}

export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const now = new Date();
  const days30 = new Date(now);
  days30.setDate(days30.getDate() - 30);
  const days7 = new Date(now);
  days7.setDate(days7.getDate() - 7);
  const hours24 = new Date(now);
  hours24.setHours(hours24.getHours() - 24);

  // ─── High-spend users (top 10 by monthly USD) ──────────────────────
  // Pull all active subs + their users, then aggregate client-side
  // (SQLite doesn't support complex aggregations across tables cleanly).
  const activeSubs = await db.subscription.findMany({
    where: { status: "active" },
    select: {
      amount: true,
      currency: true,
      billingCycle: true,
      userId: true,
      user: {
        select: { id: true, name: true, email: true, country: true, currency: true, plan: true },
      },
    },
  });
  const byUser = new Map<
    string,
    {
      user: (typeof activeSubs)[number]["user"];
      monthlyUsd: number;
      activeSubs: number;
    }
  >();
  for (const s of activeSubs) {
    const m = monthlyUsd(s.amount, s.currency, s.billingCycle);
    const existing = byUser.get(s.userId) ?? {
      user: s.user,
      monthlyUsd: 0,
      activeSubs: 0,
    };
    existing.monthlyUsd += m;
    existing.activeSubs += 1;
    byUser.set(s.userId, existing);
  }
  const highSpendUsers = [...byUser.values()]
    .sort((a, b) => b.monthlyUsd - a.monthlyUsd)
    .slice(0, 10);

  // ─── Inactive users (no activity in 30+ days, limited to 50) ────────
  const inactiveUsersRaw = await db.user.findMany({
    where: { updatedAt: { lt: days30 } },
    orderBy: { updatedAt: "asc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      updatedAt: true,
      createdAt: true,
      country: true,
    },
  });
  // Annotate with lastSeen + activeSubs
  const inactiveUserIds = inactiveUsersRaw.map((u) => u.id);
  const subCounts = await db.subscription.groupBy({
    by: ["userId"],
    where: { userId: { in: inactiveUserIds }, status: "active" },
    _count: { userId: true },
  });
  const subCountMap = new Map(subCounts.map((s) => [s.userId, s._count.userId]));
  const inactiveUsers = inactiveUsersRaw.map((u) => ({
    ...u,
    activeSubs: subCountMap.get(u.id) ?? 0,
    lastSeen: u.updatedAt,
  }));

  // ─── Churn risk ─────────────────────────────────────────────────────
  // (a) Users with 0 active subs (capped to 50)
  const usersWithActiveSubs = new Set(activeSubs.map((s) => s.userId));
  const allUsers = await db.user.findMany({
    select: {
      id: true, name: true, email: true, createdAt: true, updatedAt: true, country: true,
    },
    take: 500,
    orderBy: { updatedAt: "desc" },
  });
  const zeroSubUsers = allUsers
    .filter((u) => !usersWithActiveSubs.has(u.id))
    .slice(0, 50);

  // (b) Users who cancelled a sub in last 7 days
  const recentCancellations = await db.subscription.findMany({
    where: {
      status: "cancelled",
      updatedAt: { gte: days7 },
    },
    take: 50,
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, country: true },
      },
    },
  });

  // ─── Recent signups (last 24h) ──────────────────────────────────────
  const recentSignups = await db.user.findMany({
    where: { createdAt: { gte: hours24 } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      country: true,
      plan: true,
      currency: true,
    },
  });

  return NextResponse.json({
    highSpendUsers,
    inactiveUsers,
    churnRisk: {
      zeroSubUsers,
      recentCancellations,
    },
    recentSignups,
    counts: {
      highSpend: highSpendUsers.length,
      inactive: inactiveUsers.length,
      churnRiskZeroSub: zeroSubUsers.length,
      churnRiskCancelled: recentCancellations.length,
      recentSignups: recentSignups.length,
    },
    generatedAt: now.toISOString(),
  });
}
