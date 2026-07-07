import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOtp, issueToken } from "@/lib/token-store";
import { seedDemoSubscriptions } from "@/lib/auth";
import { ensureUserProgress } from "@/lib/gamification";

// Verify the email OTP. Only after successful verification is the user
// account created (or found) and a token issued.
export async function POST(req: NextRequest) {
  const { email, otp, name } = await req.json();
  if (!email || !otp) {
    return NextResponse.json({ error: "email and otp required" }, { status: 400 });
  }
  if (!verifyOtp(email, otp)) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  let user = await db.user.findUnique({ where: { email } });
  const isNew = !user;
  if (!user) {
    user = await db.user.create({
      data: { email, name: name || email.split("@")[0] },
    });
    await seedDemoSubscriptions(user.id);
  }
  await ensureUserProgress(user.id);
  await db.linkedAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: "email" } },
    update: {},
    create: { userId: user.id, provider: "email", identifier: email },
  });

  const token = issueToken(user.id);
  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      image: user.image,
    },
    isNew,
  });
}
