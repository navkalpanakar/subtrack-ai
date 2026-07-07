import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDemoSubscriptions } from "@/lib/auth";
import { issueToken } from "@/lib/token-store";
import { ensureUserProgress } from "@/lib/gamification";

// Token-based demo login. Bypasses cookies so it works inside cross-origin
// preview iframes (where SameSite cookies / third-party cookies are blocked).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email as string) || "guest@subtrack.ai";
  const name = (body.name as string) || "Guest User";

  let user = await db.user.findUnique({ where: { email } });
  const isNew = !user;
  if (!user) {
    user = await db.user.create({ data: { email, name } });
    await seedDemoSubscriptions(user.id);
  }
  // Initialize gamification progress + seed challenges/rewards/badges
  await ensureUserProgress(user.id);

  const token = issueToken(user.id);
  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, image: user.image },
    isNew,
  });
}
