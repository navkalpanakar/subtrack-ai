import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { scanReceiptImage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { image } = await req.json();
  if (!image || typeof image !== "string")
    return NextResponse.json({ error: "image (data URL) required" }, { status: 400 });

  const parsed = await scanReceiptImage(image);
  return NextResponse.json({ subscriptions: parsed });
}
