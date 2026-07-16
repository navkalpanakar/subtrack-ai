import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireAdminWrite } from "@/lib/admin-session";

// GET /api/admin/users/[id] → user detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      progress: true,
      subscriptions: {
        orderBy: { nextBillingDate: "asc" },
      },
      badges: { include: { badge: true }, orderBy: { earnedAt: "desc" } },
      linkedAccounts: true,
      rewards: { include: { reward: true }, orderBy: { redeemedAt: "desc" }, take: 20 },
      referrals: { take: 20, orderBy: { createdAt: "desc" } },
    },
  });

  // SpinResult doesn't have a back-relation on User, so fetch separately
  // if we want recent spins. Keep the detail payload small.
  let recentSpins: Array<{ id: string; points: number; date: string; createdAt: string }> = [];
  if (user) {
    recentSpins = await db.spinResult.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, points: true, date: true, createdAt: true },
    });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: { ...user, spinResults: recentSpins } });
}

// PATCH /api/admin/users/[id] → edit user (name, plan, currency, points, country)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Prisma.UserUpdateInput = {};
  if (typeof body?.name === "string") data.name = body.name || null;
  if (typeof body?.email === "string") data.email = body.email.toLowerCase();
  if (typeof body?.plan === "string" && ["free", "premium"].includes(body.plan)) {
    data.plan = body.plan;
  }
  if (typeof body?.currency === "string") data.currency = body.currency;
  if (typeof body?.country === "string") data.country = body.country || null;
  if (typeof body?.countryCode === "string") data.countryCode = body.countryCode || null;
  if (typeof body?.city === "string") data.city = body.city || null;
  if (typeof body?.occupation === "string") data.occupation = body.occupation || null;
  if (typeof body?.organization === "string") data.organization = body.organization || null;

  const pointsDelta = Number(body?.pointsDelta) || 0;
  const pointsSet = body?.pointsSet !== undefined ? Number(body.pointsSet) : null;

  try {
    const updated = await db.user.update({
      where: { id },
      data,
    });

    // Points handling — either set absolute or apply delta.
    if (pointsSet !== null && !Number.isNaN(pointsSet)) {
      const existing = await db.userProgress.findUnique({ where: { userId: id } });
      if (existing) {
        await db.userProgress.update({
          where: { userId: id },
          data: { points: Math.max(0, pointsSet) },
        });
      } else {
        await db.userProgress.create({
          data: { userId: id, points: Math.max(0, pointsSet) },
        });
      }
    } else if (pointsDelta !== 0) {
      const existing = await db.userProgress.findUnique({ where: { userId: id } });
      if (existing) {
        await db.userProgress.update({
          where: { userId: id },
          data: { points: Math.max(0, existing.points + pointsDelta) },
        });
      } else if (pointsDelta > 0) {
        await db.userProgress.create({
          data: { userId: id, points: pointsDelta },
        });
      }
    }

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] → delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const { id } = await params;

  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
