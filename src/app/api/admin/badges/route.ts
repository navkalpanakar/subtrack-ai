import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

// GET /api/admin/badges → list all badges
export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const badges = await db.badge.findMany({
    orderBy: [{ key: "asc" }],
    include: { _count: { select: { userBadges: true } } },
  });

  return NextResponse.json({
    badges: badges.map((b) => ({
      ...b,
      awardedCount: b._count.userBadges,
    })),
  });
}
