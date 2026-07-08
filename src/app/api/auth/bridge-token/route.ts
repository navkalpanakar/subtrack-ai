import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueToken } from "@/lib/token-store";
import { ensureUserProgress } from "@/lib/gamification";
import { seedDemoSubscriptions } from "@/lib/auth";

// Bridges a NextAuth session (from Google OAuth) to our token-based auth.
// Called by RootGate when it detects a NextAuth session but no token in localStorage.
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  // Find or create the user
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({ data: { email } });
    // Don't seed demo data for Google users — they start fresh
  }
  await ensureUserProgress(user.id);

  // Link the email provider
  await db.linkedAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: "email" } },
    update: {},
    create: { userId: user.id, provider: "email", identifier: email },
  });

  // Issue our token
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
  });
}
