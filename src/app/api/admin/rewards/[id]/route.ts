import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminWrite } from "@/lib/admin-session";

// PATCH /api/admin/rewards/[id] → edit reward
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Prisma.RewardUpdateInput = {};
  if (typeof body?.title === "string") data.title = body.title.trim();
  if (typeof body?.detail === "string") data.detail = body.detail.trim();
  if (body?.cost !== undefined) {
    const cost = Number(body.cost);
    if (Number.isNaN(cost)) {
      return NextResponse.json({ error: "cost must be numeric" }, { status: 400 });
    }
    data.cost = cost;
  }
  if (typeof body?.tier === "string") {
    if (!["bronze", "silver", "gold"].includes(body.tier)) {
      return NextResponse.json({ error: "tier must be bronze|silver|gold" }, { status: 400 });
    }
    data.tier = body.tier;
  }
  if (typeof body?.icon === "string") data.icon = body.icon;
  if (typeof body?.active === "boolean") data.active = body.active;

  const reward = await db.reward.update({ where: { id }, data });
  return NextResponse.json({ reward });
}

// DELETE /api/admin/rewards/[id] → delete reward
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const { id } = await params;
  await db.reward.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
