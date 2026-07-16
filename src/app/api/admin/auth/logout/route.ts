import { NextRequest, NextResponse } from "next/server";
import { revokeAdminToken } from "@/lib/admin-session";

// POST /api/admin/auth/logout → revokes the admin token
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  revokeAdminToken(token);
  return NextResponse.json({ ok: true });
}
