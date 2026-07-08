import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getUserId } from "@/lib/session";

// NOTE: Real Outlook/Microsoft sync requires Microsoft Graph API OAuth
// (Mail.Read scope). The NextAuth Microsoft provider is wired to enable
// automatically once MS env vars are present. For first-run preview we
// return a realistic set of subscriptions "detected" from the inbox.
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
    connected: false, // true once real MS Graph OAuth is wired
    scanSource: "demo-outlook-preview",
    detected: [
      { name: "Microsoft 365 Family", provider: "Microsoft", category: "Productivity", amount: 9.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(11), notes: "Detected from Outlook billing email", logo: "https://logo.clearbit.com/microsoft.com", color: "#00A4EF", cancelUrl: "https://account.microsoft.com/services" },
      { name: "LinkedIn Premium", provider: "LinkedIn", category: "Productivity", amount: 39.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(16), notes: "Detected from Outlook billing email", logo: "https://logo.clearbit.com/linkedin.com", color: "#0A66C2", cancelUrl: "https://www.linkedin.com/premium/manage" },
      { name: "Xbox Game Pass", provider: "Microsoft", category: "Gaming", amount: 16.99, currency: "USD", billingCycle: "monthly", nextBillingDate: inDays(24), notes: "Detected from Outlook billing email", logo: "https://logo.clearbit.com/xbox.com", color: "#107C10", cancelUrl: "https://account.microsoft.com/services" },
    ],
  });
}
