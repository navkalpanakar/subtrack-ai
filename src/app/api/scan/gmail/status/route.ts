import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Checks whether the current user has an active Google OAuth session with
// a valid access token. This is required for Gmail inbox scanning.
//
// Why this matters: a user who signed in via email/OTP has a token-based
// session but NO Google OAuth session. Even if they have a `LinkedAccount`
// row for "google" (from a previous connection), the access token may have
// expired. This endpoint tells the frontend whether Gmail sync will work
// RIGHT NOW.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const session = await getServerSession(authOptions);
    const accessToken = (session?.user as { accessToken?: string })?.accessToken;

    if (!session || !accessToken) {
      return NextResponse.json({
        connected: false,
        reason: "no-google-session",
        message:
          "Gmail sync requires signing in with Google. Please log out and use 'Continue with Google' to enable this feature.",
      });
    }

    return NextResponse.json({
      connected: true,
      email: session.user?.email || null,
    });
  } catch {
    return NextResponse.json({
      connected: false,
      reason: "session-check-failed",
      message: "Could not verify Google connection. Please re-sign in with Google.",
    });
  }
}
