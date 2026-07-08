import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Returns which providers the current user has linked.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const linked = await db.linkedAccount.findMany({ where: { userId } });
  return NextResponse.json({
    linked: linked.map((l) => ({ provider: l.provider, identifier: l.identifier })),
    // convenience booleans
    google: linked.some((l) => l.provider === "google"),
    microsoft: linked.some((l) => l.provider === "microsoft"),
    apple: linked.some((l) => l.provider === "apple"),
    email: linked.some((l) => l.provider === "email"),
    phone: linked.some((l) => l.provider === "phone"),
  });
}
