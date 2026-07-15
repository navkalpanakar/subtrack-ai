import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import Stripe from "stripe";

// Create a Stripe Checkout session for upgrading to Premium.
// Premium: unlimited subscriptions, live price insights, advanced offers.
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

const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || "";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: PREMIUM_PRICE_ID ? [{ price: PREMIUM_PRICE_ID, quantity: 1 }] : [],
    success_url: `${origin}/app?upgrade=success`,
    cancel_url: `${origin}/app?upgrade=cancelled`,
    metadata: { userId: user.id },
  });

  return NextResponse.json({ url: session.url });
}
