import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// GET the current user's profile
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, phone: true, image: true,
      referralCode: true, createdAt: true,
      dateOfBirth: true, occupation: true, organization: true,
      country: true, countryCode: true, city: true, currency: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const linked = await db.linkedAccount.findMany({ where: { userId } });
  return NextResponse.json({
    ...user,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    linkedAccounts: linked.map((l) => ({ provider: l.provider, identifier: l.identifier })),
  });
}

// PATCH — update name, phone, DOB, occupation, organization (no verification needed)
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: {
    name?: string;
    phone?: string | null;
    dateOfBirth?: Date | null;
    occupation?: string | null;
    organization?: string | null;
  } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.phone === "string") data.phone = body.phone || null;
  if (body.dateOfBirth !== undefined) {
    data.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  }
  if (body.occupation !== undefined) data.occupation = body.occupation || null;
  if (body.organization !== undefined) data.organization = body.organization || null;

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, name: true, email: true, phone: true, image: true,
      dateOfBirth: true, occupation: true, organization: true,
    },
  });
  return NextResponse.json({
    ...updated,
    dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.toISOString().slice(0, 10) : null,
  });
}
