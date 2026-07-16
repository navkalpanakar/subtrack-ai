import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireAdminWrite } from "@/lib/admin-session";

// GET /api/admin/challenges → list all challenges
export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const challenges = await db.challenge.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { userProgress: true } } },
  });

  return NextResponse.json({
    challenges: challenges.map((c) => ({
      ...c,
      participants: c._count.userProgress,
    })),
  });
}

// POST /api/admin/challenges → create challenge
export async function POST(req: NextRequest) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const body = await req.json().catch(() => null);
  const title = (body?.title as string | undefined)?.trim();
  const detail = (body?.detail as string | undefined)?.trim();
  const points = Number(body?.points);
  const goal = Number(body?.goal);
  const icon = body?.icon || "target";
  const active = body?.active !== false;

  if (!title || !detail || Number.isNaN(points) || Number.isNaN(goal)) {
    return NextResponse.json(
      { error: "title, detail, numeric points, and numeric goal are required" },
      { status: 400 }
    );
  }

  const challenge = await db.challenge.create({
    data: { title, detail, points, goal, icon, active },
  });
  return NextResponse.json({ challenge });
}
