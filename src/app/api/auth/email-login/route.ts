import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueToken } from "@/lib/token-store";
import { seedDemoSubscriptions } from "@/lib/auth";
import { ensureUserProgress } from "@/lib/gamification";

// Email login (passwordless — just enter email + optional name). In
// production this would send a magic link; here we create/find the user
// directly so the flow works in preview.
export async function POST(req: NextRequest) {
  const { email, name } = await req.json();
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
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
