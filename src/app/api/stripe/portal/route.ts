import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import Stripe from "stripe";

// Open Stripe Customer Portal for managing/cancelling the subscription.
// Lazy-init so the build doesn't fail when STRIPE_SECRET_KEY is missing.
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2025-06-30.basil" as Stripe.LatestApiVersion,
    });
  }
  return stripeInstance;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 400 });
  }

  const stripe = getStripe();
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/app`,
  });

  return NextResponse.json({ url: session.url });
}
