import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { generateInsights } from "@/lib/ai";
import { POINTS, awardPoints, awardBadge, bumpChallenge } from "@/lib/gamification";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Currency priority: query param (from client's global store) > DB > USD
  const url = new URL(req.url);
  const queryCurrency = url.searchParams.get("currency");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { currency: true, occupation: true, organization: true, dateOfBirth: true },
  });
  const userCurrency = queryCurrency || user?.currency || "USD";
  const userProfile = {
    occupation: user?.occupation || null,
    organization: user?.organization || null,
    dateOfBirth: user?.dateOfBirth || null,
  };

  const subs = await db.subscription.findMany({
    where: { userId, status: "active" },
    select: {
      name: true,
      provider: true,
      category: true,
      amount: true,
      currency: true,
      billingCycle: true,
      usageTags: true,
    },
  });

  if (subs.length === 0) return NextResponse.json([]);

  const insights = await generateInsights(
    subs.map((s) => ({ ...s, amount: Number(s.amount), currency: userCurrency })),
    userCurrency,
    userProfile
  );

  // Gamification: reward curiosity
  await awardPoints(userId, POINTS.VIEW_INSIGHTS);
  await awardBadge(userId, "curious");
  await bumpChallenge(userId, "🧠");

  return NextResponse.json(insights);
}
