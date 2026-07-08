import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { issueOtp } from "@/lib/token-store";
import { sendOtpEmail } from "@/lib/email";

// Send a deletion-confirmation code to the user's email before allowing
// account deletion. This is a destructive action — we verify intent.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user.email) return NextResponse.json({ error: "No email on account — add one first" }, { status: 400 });

  const otp = issueOtp(`delete-account:${userId}`);
  const result = await sendOtpEmail(user.email, otp, "delete-account");
  return NextResponse.json({ sent: true, devOtp: result.devOtp, email: user.email });
}
