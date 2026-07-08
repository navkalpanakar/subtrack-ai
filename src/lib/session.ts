import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserIdFromToken } from "@/lib/token-store";

// Resolve the current user id, preferring the header token (works in
// cross-origin iframe / preview contexts where cookies are blocked),
// falling back to the NextAuth session (Google OAuth in production).
export async function getUserId(req?: NextRequest): Promise<string | null> {
  if (req) {
    const token = req.headers.get("x-subpilot-token");
    const uid = getUserIdFromToken(token);
    if (uid) return uid;
  }
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id || null;
}
