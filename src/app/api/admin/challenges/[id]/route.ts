import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminWrite } from "@/lib/admin-session";

// PATCH /api/admin/challenges/[id] → edit challenge
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Prisma.ChallengeUpdateInput = {};
  if (typeof body?.title === "string") data.title = body.title.trim();
  if (typeof body?.detail === "string") data.detail = body.detail.trim();
  if (body?.points !== undefined) {
    const points = Number(body.points);
    if (Number.isNaN(points)) {
      return NextResponse.json({ error: "points must be numeric" }, { status: 400 });
    }
    data.points = points;
  }
  if (body?.goal !== undefined) {
    const goal = Number(body.goal);
    if (Number.isNaN(goal)) {
      return NextResponse.json({ error: "goal must be numeric" }, { status: 400 });
    }
    data.goal = goal;
  }
  if (typeof body?.icon === "string") data.icon = body.icon;
  if (typeof body?.active === "boolean") data.active = body.active;

  const challenge = await db.challenge.update({ where: { id }, data });
  return NextResponse.json({ challenge });
}

// DELETE /api/admin/challenges/[id] → delete challenge
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const { id } = await params;
  await db.challenge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
