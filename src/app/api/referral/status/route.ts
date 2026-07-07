import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Returns the user's referral stats: code, share URL, counts, points earned.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = (user.name || "user").slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "X") + Math.floor(1000 + Math.random() * 9000);
    await db.user.update({ where: { id: userId }, data: { referralCode } });
  }

  const referrals = await db.referral.findMany({ where: { referrerId: userId } });
  const shares = referrals.length;
  const installs = referrals.filter((r) => r.status === "installed" || r.status === "rewarded").length;
  const totalPoints = referrals.reduce((sum, r) => sum + r.pointsAwarded, 0);

  return NextResponse.json({
    referralCode,
    shareUrl: `https://subtrack.ai/r/${referralCode}`,
    shares,
    installs,
    totalPoints,
  });
}
