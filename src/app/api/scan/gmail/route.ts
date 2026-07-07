import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";

// NOTE: Real Gmail sync requires Google OAuth with gmail.readonly scope +
// the Gmail API. That wiring is ready to drop in once you provide Google
// OAuth credentials. For first-run preview we return a realistic set of
// subscriptions that the LLM "detected" from a mock inbox scan, so the
// one-click sync UX is fully exercisable today.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const inDays = (d: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
  };

  return NextResponse.json({
    connected: false, // becomes true once real Gmail OAuth is wired
    scanSource: "demo-inbox-preview",
    detected: [
      { name: "Disney+", provider: "Disney", category: "Streaming", amount: 10.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(9), notes: "Detected from billing email", logo: "https://logo.clearbit.com/disney.com", color: "#113CCF", cancelUrl: "https://www.disneyplus.com/account" },
      { name: "Dropbox Plus", provider: "Dropbox", category: "Cloud", amount: 11.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(14), notes: "Detected from billing email", logo: "https://logo.clearbit.com/dropbox.com", color: "#0061FF", cancelUrl: "https://www.dropbox.com/account/plan" },
      { name: "Duolingo Super", provider: "Duolingo", category: "Education", amount: 6.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(20), notes: "Detected from billing email", logo: "https://logo.clearbit.com/duolingo.com", color: "#58CC02", cancelUrl: "https://www.duolingo.com/settings" },
    ],
  });
}
