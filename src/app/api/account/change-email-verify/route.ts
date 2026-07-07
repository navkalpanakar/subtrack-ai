import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { verifyOtp } from "@/lib/token-store";

// Verify the OTP and apply the email change.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newEmail, otp } = await req.json();
  if (!newEmail || !otp) {
    return NextResponse.json({ error: "newEmail and otp required" }, { status: 400 });
  }

  const key = `change-email:${userId}:${newEmail}`;
  if (!verifyOtp(key, otp)) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { email: newEmail },
    select: { id: true, name: true, email: true, phone: true, image: true },
  });

  // Update the linked "email" account identifier
  await db.linkedAccount.upsert({
    where: { userId_provider: { userId, provider: "email" } },
    update: { identifier: newEmail },
    create: { userId, provider: "email", identifier: newEmail },
  });

  return NextResponse.json(updated);
}
