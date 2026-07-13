import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getUserId } from "@/lib/session";

// Apple Mail inbox sync.
// NOTE: Real Apple Mail sync requires Sign in with Apple + iCloud Mail
// access (very restricted by Apple). This route returns connected:false
// so the frontend honestly tells the user the feature isn't available
// yet — instead of fabricating fake subscriptions.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    connected: false,
    error:
      "Apple Mail sync isn't available yet. Please use 'Paste email' below to add subscriptions manually — just paste any billing email from Apple and we'll extract the details.",
    detected: [],
  });
}
