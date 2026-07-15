import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminWrite } from "@/lib/admin-session";

// PATCH /api/admin/badges/[id] → edit badge (title, detail, icon)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Prisma.BadgeUpdateInput = {};
  if (typeof body?.title === "string") data.title = body.title.trim();
  if (typeof body?.detail === "string") data.detail = body.detail.trim();
  if (typeof body?.icon === "string") data.icon = body.icon.trim();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const badge = await db.badge.update({ where: { id }, data });
  return NextResponse.json({ badge });
}
