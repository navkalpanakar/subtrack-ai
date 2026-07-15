import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Link a provider to the current user (used after completing an OAuth flow
// or a preview inbox-sync).
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider, identifier } = await req.json();
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  await db.linkedAccount.upsert({
    where: { userId_provider: { userId, provider } },
    update: { identifier: identifier || "" },
    create: { userId, provider, identifier: identifier || "" },
  });

  return NextResponse.json({ ok: true, provider, linked: true });
}

// Unlink a provider from the current user.
//
// For Google: removes the LinkedAccount row AND clears the NextAuth session
// (signs the user out of Google). This is necessary because the /api/account/linked
// endpoint checks for a REAL Google OAuth session — if we only deleted the DB row,
// the active session would still report Google as "linked".
//
// For phone: removes the phone number + LinkedAccount row.
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  // Don't allow unlinking email if it's the user's only login method
  if (provider === "email") {
    const user = await db.user.findUnique({ where: { id: userId } });
    const otherLinks = await db.linkedAccount.count({
      where: { userId, NOT: { provider: "email" } },
    });
    if (user?.email && otherLinks === 0) {
      return NextResponse.json(
        { error: "Cannot unlink your only login method. Add Google or phone first." },
        { status: 400 }
      );
    }
  }

  // Delete the LinkedAccount row
  await db.linkedAccount.deleteMany({ where: { userId, provider } });

  // For phone, also clear the phone number from the user record
  if (provider === "phone") {
    await db.user.update({ where: { id: userId }, data: { phone: null } });
  }

  // For Google: we need to clear the NextAuth session so the /api/account/linked
  // endpoint doesn't still see an active Google OAuth session. The frontend
  // will handle the sign-out and reload.
  const needsReauth = provider === "google";

  return NextResponse.json({
    ok: true,
    provider,
    linked: false,
    needsReauth,
    message: needsReauth
      ? "Google unlinked. You'll be signed out — please sign in again with email to continue."
      : undefined,
  });
}
