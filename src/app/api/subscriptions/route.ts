import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await db.subscription.findMany({
    where: { userId },
    orderBy: { nextBillingDate: "asc" },
  });
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sub = await db.subscription.create({
    data: {
      userId,
      name: body.name,
      provider: body.provider || body.name,
      category: body.category || "Other",
      amount: Number(body.amount) || 0,
      currency: body.currency || "USD",
      billingCycle: body.billingCycle || "monthly",
      nextBillingDate: new Date(body.nextBillingDate || new Date()),
      startDate: body.startDate ? new Date(body.startDate) : null,
      status: body.status || "active",
      logo: body.logo || null,
      color: body.color || null,
      notes: body.notes || null,
      usageTags: Array.isArray(body.usageTags)
        ? body.usageTags.join(",")
        : body.usageTags || "",
      cancelUrl: body.cancelUrl || null,
    },
  });
  return NextResponse.json(sub, { status: 201 });
}
