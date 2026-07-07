import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { parseEmailForSubscriptions } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content || typeof content !== "string")
    return NextResponse.json({ error: "content required" }, { status: 400 });

  const parsed = await parseEmailForSubscriptions(content);
  return NextResponse.json({ subscriptions: parsed });
}
