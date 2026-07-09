import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueToken } from "@/lib/token-store";
import { ensureUserProgress } from "@/lib/gamification";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: Called by NextAuth's redirect callback after Google OAuth.
// Reads the session SERVER-SIDE (httpOnly cookie is available here),
// issues our token, and redirects to /?auth_token=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      // No session — redirect to login
      return NextResponse.redirect(new URL("/", req.url));
    }

    const email = session.user.email;

    // Find or create the user
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: session.user.name || null,
          image: session.user.image || null,
        },
      });
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

    // Redirect to home with token as query param
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("auth_token", token);
    return NextResponse.redirect(redirectUrl);
  } catch (e) {
    console.error("[bridge-token] Error:", e);
    return NextResponse.redirect(new URL("/", req.url));
  }
}

// POST: Keep for backward compatibility
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({ data: { email } });
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
  });
}
