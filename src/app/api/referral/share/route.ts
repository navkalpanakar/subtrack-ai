import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { awardPoints, awardBadge } from "@/lib/gamification";
import { POINTS } from "@/lib/gamification";

// Share the app — generates a referral code (if not already), records the
// share, and awards +5 points. In preview, "install" is simulated so both
// the sharer and a mock invitee get rewards.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate a referral code if the user doesn't have one
  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = (user.name || "user").slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "X") + Math.floor(1000 + Math.random() * 9000);
    await db.user.update({ where: { id: userId }, data: { referralCode } });
  }

  // Record the share (no points for re-sharing the same day)
  const today = new Date().toISOString().slice(0, 10);
  const sharedToday = await db.referral.findFirst({
    where: { referrerId: userId, createdAt: { gte: new Date(today) } },
  });

  let awarded = 0;
  if (!sharedToday) {
    // Award +5 points for sharing (once per day)
    awarded = 5;
    await db.referral.create({
      data: { referrerId: userId, code: referralCode, status: "shared", pointsAwarded: awarded },
    });
    await awardPoints(userId, awarded);
    await awardBadge(userId, "deal_hunter");

    // In preview: simulate an "install" 50% of the time so the user sees
    // the bonus reward flow. In production this happens when the referred
    // user actually signs up with this code.
    if (Math.random() > 0.4) {
      await db.referral.updateMany({
        where: { referrerId: userId, status: "shared" },
        data: { status: "installed", installedAt: new Date() },
      });
      const installBonus = 25;
      await awardPoints(userId, installBonus);
      awarded += installBonus;
    }
  }

  return NextResponse.json({
    referralCode,
    shareUrl: `https://subtrack.ai/r/${referralCode}`,
    awarded,
    message: awarded > 5 ? `Share + install bonus! +${awarded} points` : awarded > 0 ? `Shared! +${awarded} points` : "Already shared today — share more tomorrow!",
  });
}
