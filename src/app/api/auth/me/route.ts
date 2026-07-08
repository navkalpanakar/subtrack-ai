import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromToken } from "@/lib/token-store";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Validate the token from the header OR the NextAuth session,
// and return the current user.
export async function GET(req: NextRequest) {
  // Method 1: Check our token header
  const token = req.headers.get("x-subpilot-token");
  const tokenUserId = getUserIdFromToken(token);

  if (tokenUserId) {
    const user = await db.user.findUnique({
      where: { id: tokenUserId },
      select: { id: true, email: true, name: true, image: true },
    });
    if (user) return NextResponse.json({ user });
  }

  // Method 2: Check NextAuth session (Google OAuth)
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, name: true, image: true },
      });
      if (user) return NextResponse.json({ user });
    }
  } catch {
    // Session check failed
  }

  return NextResponse.json({ user: null }, { status: 200 });
}
