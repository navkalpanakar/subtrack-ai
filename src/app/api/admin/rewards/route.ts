import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireAdminWrite } from "@/lib/admin-session";

// GET /api/admin/rewards → list all rewards
export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const rewards = await db.reward.findMany({
    orderBy: [{ tier: "asc" }, { cost: "asc" }],
    include: {
      _count: { select: { redeemed: true } },
    },
  });

  return NextResponse.json({
    rewards: rewards.map((r) => ({
      ...r,
      redeemedCount: r._count.redeemed,
    })),
  });
}

// POST /api/admin/rewards → create reward
export async function POST(req: NextRequest) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const body = await req.json().catch(() => null);
  const title = (body?.title as string | undefined)?.trim();
  const detail = (body?.detail as string | undefined)?.trim();
  const cost = Number(body?.cost);
  const tier = body?.tier || "bronze";
  const icon = body?.icon || "gift";
  const active = body?.active !== false;

  if (!title || !detail || Number.isNaN(cost)) {
    return NextResponse.json(
      { error: "title, detail, and numeric cost are required" },
      { status: 400 }
    );
  }
  if (!["bronze", "silver", "gold"].includes(tier)) {
    return NextResponse.json({ error: "tier must be bronze|silver|gold" }, { status: 400 });
  }

  const reward = await db.reward.create({
    data: { title, detail, cost, tier, icon, active },
  });
  return NextResponse.json({ reward });
}
