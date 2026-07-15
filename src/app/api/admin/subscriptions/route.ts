import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

// GET /api/admin/subscriptions → all subscriptions across all users
//
// Query:
//   provider — exact provider match (case-insensitive)
//   category — exact category match
//   currency — exact currency match
//   status   — active | cancelled | trialing | paused
//   q        — search name/provider
//   page     — 1-based (default 1)
//   limit    — default 25, max 100
//   sort     — "newest" (default) | "oldest" | "amountDesc" | "amountAsc" | "nextBilling"
export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const currency = url.searchParams.get("currency")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const q = url.searchParams.get("q")?.trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
  const sort = url.searchParams.get("sort") || "newest";

  const where: Prisma.SubscriptionWhereInput = {};
  if (provider) where.provider = { contains: provider };
  if (category) where.category = category;
  if (currency) where.currency = currency;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { provider: { contains: q } },
    ];
  }

  let orderBy: Prisma.SubscriptionOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };
  else if (sort === "amountDesc") orderBy = { amount: "desc" };
  else if (sort === "amountAsc") orderBy = { amount: "asc" };
  else if (sort === "nextBilling") orderBy = { nextBillingDate: "asc" };

  const [total, rows] = await Promise.all([
    db.subscription.count({ where }),
    db.subscription.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  // Aggregate side-bar stats: providers + categories + currencies lists
  const [providerAgg, categoryAgg, currencyAgg, statusAgg] = await Promise.all([
    db.subscription.groupBy({
      by: ["provider"],
      _count: { provider: true },
      orderBy: { _count: { provider: "desc" } },
      take: 50,
    }),
    db.subscription.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
      take: 50,
    }),
    db.subscription.groupBy({
      by: ["currency"],
      _count: { currency: true },
      orderBy: { _count: { currency: "desc" } },
      take: 50,
    }),
    db.subscription.groupBy({
      by: ["status"],
      _count: { status: true },
      orderBy: { _count: { status: "desc" } },
    }),
  ]);

  return NextResponse.json({
    subscriptions: rows,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    facets: {
      providers: providerAgg.map((p) => ({ value: p.provider, count: p._count.provider })),
      categories: categoryAgg.map((c) => ({ value: c.category, count: c._count.category })),
      currencies: currencyAgg.map((c) => ({ value: c.currency, count: c._count.currency })),
      statuses: statusAgg.map((s) => ({ value: s.status, count: s._count.status })),
    },
  });
}
