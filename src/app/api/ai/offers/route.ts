import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { findProviderOffers } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await req.json();
  if (!provider)
    return NextResponse.json({ error: "provider required" }, { status: 400 });

  const offers = await findProviderOffers(provider);
  return NextResponse.json({ offers });
}
