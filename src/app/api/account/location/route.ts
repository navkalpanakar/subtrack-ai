import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Store the user's location (from geolocation) + currency preference.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { country, countryCode, city, currency } = await req.json();

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(country !== undefined && { country }),
      ...(countryCode !== undefined && { countryCode }),
      ...(city !== undefined && { city }),
      ...(currency !== undefined && { currency }),
    },
    select: { id: true, country: true, countryCode: true, city: true, currency: true },
  });

  return NextResponse.json(updated);
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { country: true, countryCode: true, city: true, currency: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}
