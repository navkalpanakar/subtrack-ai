import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { POINTS, awardPoints, awardBadge, bumpChallenge } from "@/lib/gamification";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Fetch the subscription to record savings before deleting
  const sub = await db.subscription.findFirst({ where: { id, userId } });
  await db.subscription.deleteMany({ where: { id, userId } });

  if (sub) {
    // Gamification: big reward for cancelling + savings tracking
    await awardPoints(userId, POINTS.CANCEL_SUBSCRIPTION);
    await awardBadge(userId, "first_cancel");
    await bumpChallenge(userId, "✂️");
    // Track total saved (monthly equivalent)
    const monthly =
      sub.billingCycle === "yearly"
        ? Number(sub.amount) / 12
        : sub.billingCycle === "quarterly"
        ? Number(sub.amount) / 3
        : Number(sub.amount);
    await db.userProgress.upsert({
      where: { userId },
      update: { totalSaved: { increment: Math.round(monthly) } },
      create: { userId, totalSaved: Math.round(monthly) },
    });
    await awardBadge(userId, "savings_100");
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  for (const key of [
    "name",
    "provider",
    "category",
    "currency",
    "billingCycle",
    "status",
    "logo",
    "color",
    "notes",
    "cancelUrl",
  ]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.amount !== undefined) data.amount = Number(body.amount);
  if (body.nextBillingDate !== undefined)
    data.nextBillingDate = new Date(body.nextBillingDate);
  if (body.startDate !== undefined)
    data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.usageTags !== undefined)
    data.usageTags = Array.isArray(body.usageTags)
      ? body.usageTags.join(",")
      : body.usageTags;

  const sub = await db.subscription.updateMany({ where: { id, userId }, data });
  return NextResponse.json(sub);
}
