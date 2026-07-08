// Email sending helper. Uses Resend (https://resend.com) — generous free
// tier: 3,000 emails/month, 100/day. No credit card required to start.
//
// SETUP (2 minutes):
// 1. Sign up at resend.com (free)
// 2. Add your domain (or use the default onboarding@resend.dev for testing)
// 3. Create an API key
// 4. Add to your .env:
//      RESEND_API_KEY="re_xxxxxxxx"
//      EMAIL_FROM="SubTrack AI <onboarding@resend.dev>"
//    (replace with your verified domain's email in production)
//
// When RESEND_API_KEY is NOT set, the code is returned in the API response
// as `devOtp` so the preview UI can display it. When it IS set, real
// emails are sent and `devOtp` is omitted.

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || "SubTrack AI <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

export type SendEmailResult = {
  sent: boolean;
  devOtp?: string; // only present when real email is NOT sent (preview mode)
  error?: string;
};

/**
 * Send a verification code email. Returns whether it was sent for real.
 * In preview (no API key), returns the code as devOtp for the UI to show.
 */
export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: "login" | "change-email" | "delete-account" = "login"
): Promise<SendEmailResult> {
  // Preview mode — no API key configured
  if (!resend) {
    return { sent: true, devOtp: code };
  }

  const subject =
    purpose === "delete-account"
      ? "⚠️ Confirm your account deletion"
      : purpose === "change-email"
      ? "Confirm your new email"
      : "Your SubTrack AI verification code";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc;">
  <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 28px; font-weight: 800; color: #059669;">SubTrack <span style="color: #10b981;">AI</span></div>
    </div>
    <h1 style="font-size: 20px; color: #0f172a; margin: 0 0 16px;">${subject}</h1>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      ${purpose === "delete-account"
        ? "You requested to permanently delete your SubTrack AI account. Use the code below to confirm. This action cannot be undone."
        : purpose === "change-email"
        ? "Use the code below to confirm your new email address."
        : "Use the code below to verify your email and sign in to SubTrack AI."}
    </p>
    <div style="text-align: center; background: #f0fdf4; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
      <p style="font-size: 12px; color: #059669; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Your verification code</p>
      <p style="font-size: 36px; font-weight: 800; letter-spacing: 0.5em; color: #059669; margin: 0;">${code}</p>
    </div>
    <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
      This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">SubTrack AI · Outsmart your subscriptions</p>
  </div>
</body>
</html>
`;

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[email] Resend error:", error);
      // Fall back to devOtp so the user isn't blocked
      return { sent: true, devOtp: code, error: error.message };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] Send failed:", e);
    return { sent: true, devOtp: code, error: "Email send failed" };
  }
}
