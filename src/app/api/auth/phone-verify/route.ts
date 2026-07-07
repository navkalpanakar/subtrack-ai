import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOtp, issueToken } from "@/lib/token-store";
import { seedDemoSubscriptions } from "@/lib/auth";
import { ensureUserProgress } from "@/lib/gamification";

// Verify the OTP and create/find the user by phone, then issue a token.
export async function POST(req: NextRequest) {
  const { phone, otp, name } = await req.json();
  if (!phone || !otp) {
    return NextResponse.json({ error: "phone and otp required" }, { status: 400 });
  }
  if (!verifyOtp(phone, otp)) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  let user = await db.user.findUnique({ where: { phone } });
  const isNew = !user;
  if (!user) {
    user = await db.user.create({
      data: { phone, name: name || "Phone User" },
    });
    await seedDemoSubscriptions(user.id);
  }
  await ensureUserProgress(user.id);
  // Link the phone provider
  await db.linkedAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: "phone" } },
    update: {},
    create: { userId: user.id, provider: "phone", identifier: phone },
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
