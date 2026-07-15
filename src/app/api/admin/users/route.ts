import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

// GET /api/admin/users → list users with pagination + search
//
// Query:
//   q      — search name/email/phone (case-insensitive)
//   plan   — "free" | "premium"
//   page   — 1-based (default 1)
//   limit  — default 25, max 100
//   sort   — "newest" (default) | "oldest" | "points" | "spend"
export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const plan = url.searchParams.get("plan");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
  const sort = url.searchParams.get("sort") || "newest";

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
      { phone: { contains: q } },
      { referralCode: { contains: q } },
    ];
  }
  if (plan === "free" || plan === "premium") {
    where.plan = plan;
  }

  let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };
  // For "points" / "spend" we sort in-memory after fetching the page
  // (avoids a join + complex ordering on SQLite).

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        progress: { select: { points: true, level: true, streak: true } },
        subscriptions: {
          where: { status: "active" },
          select: { amount: true, currency: true, billingCycle: true },
        },
      },
    }),
  ]);

  // Approximate monthly USD per user for "spend" sort + display.
  const FX_TO_USD: Record<string, number> = {
    USD: 1, INR: 0.012, EUR: 1.08, GBP: 1.27, JPY: 0.0067,
    AUD: 0.66, CAD: 0.74, SGD: 0.74, AED: 0.27, BRL: 0.2,
  };
  const monthlyUsd = (amount: number, currency: string, cycle: string) => {
    const usd = amount * (FX_TO_USD[currency.toUpperCase()] ?? 1);
    if (cycle === "yearly" || cycle === "annual") return usd / 12;
    if (cycle === "weekly") return (usd / 7) * 30;
    if (cycle === "quarterly") return usd / 3;
    if (cycle === "daily") return usd * 30;
    return usd;
  };

  type Row = typeof rows[number];

  const enriched: Array<Row & { monthlySpendUsd: number; activeSubs: number }> = rows.map(
    (u) => {
      const monthlySpendUsd = u.subscriptions.reduce(
        (sum, s) => sum + monthlyUsd(s.amount, s.currency, s.billingCycle),
        0
      );
      return { ...u, monthlySpendUsd, activeSubs: u.subscriptions.length };
    }
  );

  if (sort === "spend") {
    enriched.sort((a, b) => b.monthlySpendUsd - a.monthlySpendUsd);
  } else if (sort === "points") {
    enriched.sort(
      (a, b) => (b.progress?.points ?? 0) - (a.progress?.points ?? 0)
    );
  }

  return NextResponse.json({
    users: enriched,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}
