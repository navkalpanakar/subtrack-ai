import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserIdFromToken } from "@/lib/token-store";

// Validate the token from the header and return the current user.
export async function GET(req: NextRequest) {
  const token = req.headers.get("x-subpilot-token");
  const userId = getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ user: null }, { status: 200 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, image: true },
  });
  return NextResponse.json({ user });
}
