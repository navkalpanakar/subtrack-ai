import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { issueOtp } from "@/lib/token-store";

// Send a verification code to a NEW email before allowing the change.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newEmail } = await req.json();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  // Check the new email isn't already taken by another user
  const existing = await db.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) {
    return NextResponse.json({ error: "This email is already in use" }, { status: 400 });
  }

  const otp = issueOtp(`change-email:${userId}:${newEmail}`);
  return NextResponse.json({ sent: true, devOtp: otp });
}
