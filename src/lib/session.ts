import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserIdFromToken } from "@/lib/token-store";
import { db } from "@/lib/db";

// Resolve the current user id, supporting BOTH auth methods:
// 1. Our token (x-subpilot-token header) — for email/demo login
// 2. NextAuth session (httpOnly cookie) — for Google OAuth
export async function getUserId(req?: NextRequest): Promise<string | null> {
  // Method 1: Check our token header first
  if (req) {
    const token = req.headers.get("x-subpilot-token");
    const uid = getUserIdFromToken(token);
    if (uid) return uid;
  }

  // Method 2: Check NextAuth session (Google OAuth)
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      // Find the user by email from the NextAuth session
      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (user) return user.id;
    }
  } catch {
    // Session check failed — continue
  }

  return null;
}
