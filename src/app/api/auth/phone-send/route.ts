import { NextRequest, NextResponse } from "next/server";
import { issueOtp, peekOtp } from "@/lib/token-store";

// Send OTP to the given phone number. In production this calls Twilio/etc.
// In dev/preview, the OTP is returned so the UI can display it for testing.
export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone || typeof phone !== "string" || phone.length < 6) {
    return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
  }
  const otp = issueOtp(phone);
  // Dev preview: return the OTP so the user can see it without real SMS.
  // In production, remove `devOtp` from the response.
  return NextResponse.json({ sent: true, devOtp: otp });
}
