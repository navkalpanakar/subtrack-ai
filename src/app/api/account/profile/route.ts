import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// GET the current user's profile
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, image: true, referralCode: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const linked = await db.linkedAccount.findMany({ where: { userId } });
  return NextResponse.json({
    ...user,
    linkedAccounts: linked.map((l) => ({ provider: l.provider, identifier: l.identifier })),
  });
}

// PATCH — update name and/or phone (no verification needed for these)
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: { name?: string; phone?: string } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.phone === "string") {
    // Phone is optional — allow clearing with empty string
    data.phone = body.phone || null;
  }

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, phone: true, image: true },
  });
  return NextResponse.json(updated);
}
