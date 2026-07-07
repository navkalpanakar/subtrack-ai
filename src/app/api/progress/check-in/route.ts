import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { dailyCheckIn, bumpChallenge } from "@/lib/gamification";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await dailyCheckIn(userId);
  if (result.checkedIn) {
    await bumpChallenge(userId, "🔥");
  }
  return NextResponse.json(result);
}
