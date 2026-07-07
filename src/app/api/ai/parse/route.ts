import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { parseSubscriptionText, verifySubscriptionPrice } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, currency } = await req.json();
  if (!text || typeof text !== "string")
    return NextResponse.json({ error: "text required" }, { status: 400 });

  const userCurrency = currency || "USD";
  const parsed = await parseSubscriptionText(text, userCurrency);

  // Price verification: if the parsed amount looks suspiciously low vs the
  // real web price, flag it so the client can ask the user to confirm.
  let verification = null;
  if (parsed.amount && parsed.amount > 0 && parsed.provider) {
    verification = await verifySubscriptionPrice(
      parsed.provider,
      parsed.amount,
      parsed.currency || userCurrency,
      parsed.billingCycle
    );
  }

  return NextResponse.json({ ...parsed, verification });
}
