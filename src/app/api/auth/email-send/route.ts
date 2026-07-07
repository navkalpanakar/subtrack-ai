import { NextRequest, NextResponse } from "next/server";
import { issueOtp } from "@/lib/token-store";

// Send a verification code to the given email. In production this sends
// a real email via SendGrid/etc. In dev/preview, the code is returned so
// the UI can display it for testing.
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  // Validate email format server-side too
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }
  const otp = issueOtp(email);
  // Dev preview: return the OTP so the user can see it without a real email.
  // In production, remove `devOtp` from the response and send via SMTP.
  return NextResponse.json({ sent: true, devOtp: otp });
}
