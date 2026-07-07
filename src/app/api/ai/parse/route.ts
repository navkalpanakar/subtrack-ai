import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { parseSubscriptionText } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text || typeof text !== "string")
    return NextResponse.json({ error: "text required" }, { status: 400 });

  const parsed = await parseSubscriptionText(text);
  return NextResponse.json(parsed);
}
