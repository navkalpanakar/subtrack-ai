import { NextRequest, NextResponse } from "next/server";
import { issueOtp } from "@/lib/token-store";
import { sendOtpEmail } from "@/lib/email";

// Send a verification code to the given email. Uses Resend for real email
// delivery when RESEND_API_KEY is set. Falls back to returning the code in
// the response (devOtp) for preview/testing when no API key is configured.
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }
  const otp = issueOtp(email);
  const result = await sendOtpEmail(email, otp, "login");
  return NextResponse.json({ sent: true, devOtp: result.devOtp });
}
