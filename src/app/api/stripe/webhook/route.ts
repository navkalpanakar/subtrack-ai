import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Stripe from "stripe";

// Stripe webhook — handles subscription created/updated/deleted events.
// Set this URL in Stripe Dashboard → Webhooks.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-06-30.basil" as Stripe.LatestApiVersion,
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId) {
        await db.user.update({
          where: { id: userId },
          data: {
            plan: "premium",
            stripeSubscriptionId: session.subscription as string,
            premiumExpiresAt: new Date(Date.now() + 365 * 86400000), // 1 year
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.user.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: "free", premiumExpiresAt: null, stripeSubscriptionId: null },
      });
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await db.user.updateMany({
          where: { stripeCustomerId: invoice.customer },
          data: { plan: "premium", premiumExpiresAt: new Date(Date.now() + 365 * 86400000) },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
