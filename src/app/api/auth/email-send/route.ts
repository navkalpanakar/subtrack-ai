import { NextRequest, NextResponse } from "next/server";
import { issueOtp } from "@/lib/token-store";
import { sendOtpEmail } from "@/lib/email";

// Send a verification code to the given email. Uses Resend for real email
// delivery when RESEND_API_KEY is set. In dev (no API key), returns devOtp
// so the UI can display the code for testing. In production, devOtp is null.
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }
  const otp = issueOtp(email);
  const result = await sendOtpEmail(email, otp, "login");
  // Only return devOtp when Resend is NOT configured (dev/preview mode).
  // In production, devOtp is null and the code is only sent via email.
  return NextResponse.json({ sent: true, devOtp: result.devOtp || null });
}
