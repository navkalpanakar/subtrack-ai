import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { findProviderOffers } from "@/lib/ai";

// Scratch (reveal) a redeemed reward card. Deducts nothing (already paid at
// redeem time) — this fetches a live offer from the web to populate the card.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { redeemedRewardId, provider } = await req.json();
  if (!redeemedRewardId)
    return NextResponse.json({ error: "redeemedRewardId required" }, { status: 400 });

  // Get the user's currency for region-aware offer search
  const user = await db.user.findUnique({ where: { id: userId }, select: { currency: true, countryCode: true } });
  const userCurrency = user?.currency || "USD";
  const userCountry = user?.countryCode || "";

  const rr = await db.redeemedReward.findFirst({
    where: { id: redeemedRewardId, userId },
    include: { reward: true },
  });
  if (!rr)
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  if (rr.revealed)
    return NextResponse.json({ alreadyRevealed: true, offerTitle: rr.offerTitle, offerUrl: rr.offerUrl, offerDetail: rr.offerDetail });

  let offerTitle = rr.reward.title + " Unlocked!";
  let offerUrl = "https://www.google.com/search?q=subscription+deals+coupons";
  let offerDetail = rr.reward.detail;

  try {
    // Search with the user's currency + country for local deals
    const searchProvider = provider || "streaming subscription";
    const offers = await findProviderOffers(`${searchProvider} ${userCurrency} ${userCountry}`);
    if (offers.length > 0) {
      const pick = offers[Math.floor(Math.random() * Math.min(3, offers.length))];
      offerTitle = pick.title;
      offerUrl = pick.url;
      offerDetail = pick.detail;
    }
  } catch {
    // keep fallback
  }

  await db.redeemedReward.update({
    where: { id: rr.id },
    data: { revealed: true, offerTitle, offerUrl, offerDetail },
  });

  return NextResponse.json({
    revealed: true,
    offerTitle,
    offerUrl,
    offerDetail,
    tier: rr.reward.tier,
    icon: rr.reward.icon,
  });
}
