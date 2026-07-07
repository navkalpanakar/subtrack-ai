import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getUserId } from "@/lib/session";

// NOTE: Real Apple Mail sync requires Sign in with Apple + iCloud Mail
// access (very restricted). For first-run preview we return a realistic
// set of subscriptions "detected" from Apple billing receipts.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const inDays = (d: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
  };

  return NextResponse.json({
    connected: false, // true once real Apple Sign-In + Mail is wired
    scanSource: "demo-apple-preview",
    detected: [
      { name: "iCloud+ 200GB", provider: "Apple", category: "Cloud", amount: 2.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(8), notes: "Detected from Apple receipt", logo: "https://logo.clearbit.com/apple.com", color: "#3693F3", cancelUrl: "https://support.apple.com/billing" },
      { name: "Apple Music", provider: "Apple", category: "Music", amount: 10.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(15), notes: "Detected from Apple receipt", logo: "https://logo.clearbit.com/apple.com", color: "#FA2D48", cancelUrl: "https://support.apple.com/billing" },
      { name: "Apple TV+", provider: "Apple", category: "Streaming", amount: 9.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(21), notes: "Detected from Apple receipt", logo: "https://logo.clearbit.com/apple.com", color: "#111111", cancelUrl: "https://support.apple.com/billing" },
    ],
  });
}
