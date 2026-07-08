import { NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/token-store";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-subpilot-token");
  revokeToken(token);
  return NextResponse.json({ ok: true });
}
