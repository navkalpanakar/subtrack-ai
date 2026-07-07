import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Link a provider to the current user (used after completing an OAuth flow
// or a preview inbox-sync). In preview mode, we just mark it as linked.
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
