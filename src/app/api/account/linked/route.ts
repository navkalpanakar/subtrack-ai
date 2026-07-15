import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Returns which providers the current user has linked.
//
// IMPORTANT: For Google, "linked" means the user has an ACTIVE Google OAuth
// session with a valid access token — NOT just a LinkedAccount DB row.
// The old code marked Google as "linked" even when the user signed in with
// email and never actually authorized Google. This caused the Gmail button
// to show "Linked" incorrectly.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const linked = await db.linkedAccount.findMany({ where: { userId } });

  // Check if the user has a REAL Google OAuth session with an access token.
  // This is the true source of truth — not the DB row.
  let googleReallyConnected = false;
  let googleEmail: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session?.user as { accessToken?: string })?.accessToken;
    if (session?.user?.email && accessToken) {
      googleReallyConnected = true;
      googleEmail = session.user.email;
    }
  } catch {
    // Session check failed — Google not connected
  }

  // For Google: only report as linked if there's a real OAuth session.
  // If there's a stale DB row but no real session, clean it up.
  if (!googleReallyConnected) {
    const staleGoogleRow = linked.find((l) => l.provider === "google");
    if (staleGoogleRow) {
      // Clean up the stale row so it doesn't show "Linked" falsely
      await db.linkedAccount.deleteMany({ where: { userId, provider: "google" } });
    }
  }

  return NextResponse.json({
    linked: linked
      .filter((l) => l.provider !== "google" || googleReallyConnected)
      .map((l) => ({ provider: l.provider, identifier: l.identifier })),
    // Google: true only if real OAuth session exists
    google: googleReallyConnected,
    googleEmail,
    email: linked.some((l) => l.provider === "email"),
    phone: linked.some((l) => l.provider === "phone"),
  });
}
