import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-session";

// GET /api/admin/auth/me → returns the current admin (or 401)
export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;
  return NextResponse.json({ admin: r.admin });
}
