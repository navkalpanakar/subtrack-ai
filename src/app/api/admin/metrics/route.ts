import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

// GET /api/admin/metrics → dashboard stats
//
// Returns:
//   users:            { total, newToday, newThisWeek, active7d, churned30d, byCountryTop5 }
//   revenue:          { mrrByCurrency: { USD: 123.45, INR: 9999 }, totalUsdMrr, yearlyByCurrency, totalUsdYearly }
//   subscriptions:    { total, active, cancelled, cancellationRate, avgSpendPerUserUsd, topProviders: [{provider,count,monthlyUsd}] }
//   ai:               { totalCalls, calls7d, totalCostUsd, cost7dUsd, byEndpoint: [{endpoint,count,cost}] }
//   gamification:     { totalPointsDistributed, spinsToday, leaderboardSize }
//
// All amounts are converted to USD using a static FX table so the
// dashboard can show "Total MRR (USD)" in one tile. Per-currency
// breakdowns are also returned for transparency.

// Rough static FX rates to USD. These are not real-time but are good
// enough for an admin dashboard ball-park. Update periodically.
const FX_TO_USD: Record<string, number> = {
  USD: 1,
  INR: 0.012,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  AUD: 0.66,
  CAD: 0.74,
  SGD: 0.74,
  AED: 0.27,
  BRL: 0.2,
  CNY: 0.14,
  ZAR: 0.054,
  MXN: 0.06,
  NGN: 0.0008,
  PKR: 0.0036,
  IDR: 0.000063,
  PHP: 0.018,
  MYR: 0.21,
  THB: 0.028,
  KRW: 0.00075,
  RUB: 0.011,
  TRY: 0.032,
  CHF: 1.13,
  NZD: 0.6,
  SEK: 0.096,
  NOK: 0.094,
  DKK: 0.145,
  HKD: 0.13,
  TWD: 0.031,
  VND: 0.00004,
  SAR: 0.27,
  EGP: 0.021,
  BDT: 0.0091,
  LKR: 0.0031,
  NPR: 0.0075,
  UAH: 0.025,
  PLN: 0.25,
  CZK: 0.044,
  ILS: 0.27,
  ARS: 0.0011,
  CLP: 0.0011,
  COP: 0.00025,
  PEN: 0.27,
  VES: 0.000028,
};

function toUsd(amount: number, currency: string): number {
  const rate = FX_TO_USD[currency.toUpperCase()] ?? 1;
  return amount * rate;
}

// Convert an arbitrary-currency subscription amount to a monthly USD figure.
function monthlyUsd(amount: number, currency: string, cycle: string): number {
  const usd = toUsd(amount, currency);
  switch (cycle) {
    case "yearly":
    case "annual":
      return usd / 12;
    case "weekly":
      return (usd / 7) * 30;
    case "quarterly":
      return usd / 3;
    case "daily":
      return usd * 30;
    case "monthly":
    default:
      return usd;
  }
}

export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const days30 = new Date(now);
  days30.setDate(days30.getDate() - 30);
  const days7 = new Date(now);
  days7.setDate(days7.getDate() - 7);

  // ─── Users ───────────────────────────────────────────────────────
  const [
    totalUsers,
    newToday,
    newThisWeek,
    byCountryRaw,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: todayStart } } }),
    db.user.count({ where: { createdAt: { gte: weekStart } } }),
    db.user.groupBy({
      by: ["country"],
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
      take: 6,
    }),
  ]);

  // "Active 7d" — users whose updatedAt is in the last 7 days (proxy for login activity;
  // we don't have an explicit lastLoginAt field, so updatedAt is our best signal).
  const active7d = await db.user.count({ where: { updatedAt: { gte: days7 } } });
  // "Churned" — users with updatedAt older than 30 days AND at least one subscription cancelled.
  // We approximate churn as no recent activity.
  const churned30d = await db.user.count({
    where: { updatedAt: { lt: days30 } },
  });

  const byCountryTop5 = byCountryRaw
    .filter((c) => c.country && c.country !== "Unknown")
    .slice(0, 5)
    .map((c) => ({ country: c.country!, users: c._count.country }));

  // ─── Subscriptions / Revenue ─────────────────────────────────────
  const allSubs = await db.subscription.findMany({
    select: {
      amount: true,
      currency: true,
      billingCycle: true,
      status: true,
      provider: true,
      userId: true,
    },
  });

  const activeSubs = allSubs.filter((s) => s.status === "active");
  const cancelledSubs = allSubs.filter((s) => s.status === "cancelled");
  const cancellationRate =
    allSubs.length === 0 ? 0 : cancelledSubs.length / allSubs.length;

  // MRR by currency
  const mrrByCurrency: Record<string, number> = {};
  for (const s of activeSubs) {
    const cycle = s.billingCycle;
    let monthly = s.amount;
    if (cycle === "yearly" || cycle === "annual") monthly = s.amount / 12;
    else if (cycle === "weekly") monthly = (s.amount / 7) * 30;
    else if (cycle === "quarterly") monthly = s.amount / 3;
    else if (cycle === "daily") monthly = s.amount * 30;
    mrrByCurrency[s.currency] = (mrrByCurrency[s.currency] ?? 0) + monthly;
  }
  const totalUsdMrr = Object.entries(mrrByCurrency).reduce(
    (sum, [cur, amt]) => sum + toUsd(amt, cur),
    0
  );

  // Yearly by currency (annualised)
  const yearlyByCurrency: Record<string, number> = {};
  for (const [cur, amt] of Object.entries(mrrByCurrency)) {
    yearlyByCurrency[cur] = amt * 12;
  }
  const totalUsdYearly = totalUsdMrr * 12;

  // Top 10 providers (by monthly USD)
  const providerAgg = new Map<string, { count: number; monthlyUsd: number }>();
  for (const s of activeSubs) {
    const m = monthlyUsd(s.amount, s.currency, s.billingCycle);
    const existing = providerAgg.get(s.provider) ?? { count: 0, monthlyUsd: 0 };
    existing.count += 1;
    existing.monthlyUsd += m;
    providerAgg.set(s.provider, existing);
  }
  const topProviders = [...providerAgg.entries()]
    .map(([provider, v]) => ({ provider, ...v }))
    .sort((a, b) => b.monthlyUsd - a.monthlyUsd)
    .slice(0, 10);

  // Avg spend per user (monthly USD, active users only)
  const uniqueActiveUsers = new Set(activeSubs.map((s) => s.userId)).size;
  const avgSpendPerUserUsd =
    uniqueActiveUsers === 0 ? 0 : totalUsdMrr / uniqueActiveUsers;

  // ─── AI usage ────────────────────────────────────────────────────
  const [
    totalAiCalls,
    aiCalls7d,
    aiCostAgg,
    aiCost7dAgg,
    byEndpointAgg,
  ] = await Promise.all([
    db.aiUsage.count(),
    db.aiUsage.count({ where: { createdAt: { gte: days7 } } }),
    db.aiUsage.aggregate({ _sum: { costUsd: true } }),
    db.aiUsage.aggregate({
      _sum: { costUsd: true },
      where: { createdAt: { gte: days7 } },
    }),
    db.aiUsage.groupBy({
      by: ["endpoint"],
      _count: { endpoint: true },
      _sum: { costUsd: true },
      orderBy: { _count: { endpoint: "desc" } },
      take: 10,
    }),
  ]);

  const byEndpoint = byEndpointAgg.map((e) => ({
    endpoint: e.endpoint,
    count: e._count.endpoint,
    costUsd: e._sum.costUsd ?? 0,
  }));

  // ─── Gamification ────────────────────────────────────────────────
  const todayStr = now.toISOString().slice(0, 10);
  const [
    pointsAgg,
    spinsToday,
    leaderboardSize,
  ] = await Promise.all([
    db.userProgress.aggregate({ _sum: { points: true } }),
    db.spinResult.count({ where: { date: todayStr } }),
    db.userProgress.count({ where: { points: { gt: 0 } } }),
  ]);

  return NextResponse.json({
    users: {
      total: totalUsers,
      newToday,
      newThisWeek,
      active7d,
      churned30d,
      byCountryTop5,
    },
    revenue: {
      mrrByCurrency,
      totalUsdMrr,
      yearlyByCurrency,
      totalUsdYearly,
    },
    subscriptions: {
      total: allSubs.length,
      active: activeSubs.length,
      cancelled: cancelledSubs.length,
      cancellationRate,
      avgSpendPerUserUsd,
      topProviders,
    },
    ai: {
      totalCalls: totalAiCalls,
      calls7d: aiCalls7d,
      totalCostUsd: aiCostAgg._sum.costUsd ?? 0,
      cost7dUsd: aiCost7dAgg._sum.costUsd ?? 0,
      byEndpoint,
    },
    gamification: {
      totalPointsDistributed: pointsAgg._sum.points ?? 0,
      spinsToday,
      leaderboardSize,
    },
    generatedAt: now.toISOString(),
  });
}
