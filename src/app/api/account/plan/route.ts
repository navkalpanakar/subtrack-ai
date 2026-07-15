import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Returns the user's current plan + limits.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, premiumExpiresAt: true, countryCode: true },
  });

  const subCount = await db.subscription.count({ where: { userId, status: "active" } });

  const FREE_LIMIT = 3;
  const isPremium = user?.plan === "premium";
  const isExpired = user?.premiumExpiresAt ? user.premiumExpiresAt < new Date() : false;
  const effectivePlan = isPremium && !isExpired ? "premium" : "free";
  const isUS = user?.countryCode === "US";

  // Only USA has the freemium limit. All other countries are completely free.
  const hasLimit = isUS && effectivePlan !== "premium";

  return NextResponse.json({
    plan: effectivePlan,
    premiumExpiresAt: user?.premiumExpiresAt,
    subscriptionCount: subCount,
    freeLimit: hasLimit ? FREE_LIMIT : null,
    canAddMore: !hasLimit || subCount < FREE_LIMIT,
    showPremium: isUS, // only show Premium upgrade card for USA users
  });
}
