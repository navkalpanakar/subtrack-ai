import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { generateInsights } from "@/lib/ai";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await db.subscription.findMany({
    where: { userId, status: "active" },
    select: {
      name: true,
      provider: true,
      category: true,
      amount: true,
      billingCycle: true,
      usageTags: true,
    },
  });

  if (subs.length === 0) return NextResponse.json([]);

  const insights = await generateInsights(
    subs.map((s) => ({ ...s, amount: Number(s.amount) }))
  );
  return NextResponse.json(insights);
}
