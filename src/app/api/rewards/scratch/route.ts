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

  const rr = await db.redeemedReward.findFirst({
    where: { id: redeemedRewardId, userId },
    include: { reward: true },
  });
  if (!rr)
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  if (rr.revealed)
    return NextResponse.json({ alreadyRevealed: true, offerTitle: rr.offerTitle, offerUrl: rr.offerUrl, offerDetail: rr.offerDetail });

  // Try to fetch a live offer from the web for the given provider (or a
  // generic subscription deal). Falls back to a curated offer.
  let offerTitle = rr.reward.title + " Unlocked!";
  let offerUrl = "https://www.google.com/search?q=subscription+deals+coupons";
  let offerDetail = rr.reward.detail;

  try {
    const query = provider
      ? `${provider} subscription discount coupon deal 2025`
      : "best subscription deals discounts coupons 2025";
    const offers = await findProviderOffers(provider || "streaming subscription");
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
