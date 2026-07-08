import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { verifyOtp, revokeToken } from "@/lib/token-store";

// Verify the deletion code and permanently delete the account + all data.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otp } = await req.json();
  if (!otp) return NextResponse.json({ error: "otp required" }, { status: 400 });

  if (!verifyOtp(`delete-account:${userId}`, otp)) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  // Cascade delete: subscriptions, progress, challenges, rewards, badges,
  // linkedAccounts, referrals, spinResults all have onDelete: Cascade.
  await db.user.delete({ where: { id: userId } });

  const token = req.headers.get("x-subpilot-token");
  revokeToken(token);

  return NextResponse.json({ deleted: true });
}
