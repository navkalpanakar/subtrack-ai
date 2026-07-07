// Server-side in-memory token store for the demo session flow.
// This bypasses cookies entirely (which break in cross-origin preview
// iframes due to third-party cookie blocking) by issuing an opaque
// token that the client stores in localStorage and sends as a header.

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const OTP_TTL_MS = 1000 * 60 * 5; // 5 minutes

type Entry = { userId: string; expires: number };
type OtpEntry = { otp: string; phone: string; expires: number };

// Persist across hot reloads in dev.
const g = globalThis as unknown as {
  __subpilotTokens?: Map<string, Entry>;
  __subpilotOtps?: Map<string, OtpEntry>;
};
const store: Map<string, Entry> = g.__subpilotTokens ?? new Map();
g.__subpilotTokens = store;
const otpStore: Map<string, OtpEntry> = g.__subpilotOtps ?? new Map();
g.__subpilotOtps = otpStore;

export function issueToken(userId: string): string {
  const token =
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2);
  store.set(token, { userId, expires: Date.now() + TOKEN_TTL_MS });
  return token;
}

export function getUserIdFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(token);
    return null;
  }
  return entry.userId;
}

export function revokeToken(token: string | null | undefined): void {
  if (token) store.delete(token);
}

// ─── Phone OTP (mock — in production wire to Twilio/MessageBird) ────
export function issueOtp(phone: string): string {
  // 4-digit code
  const otp = String(Math.floor(1000 + Math.random() * 9000));
  otpStore.set(phone, { otp, phone, expires: Date.now() + OTP_TTL_MS });
  return otp;
}

export function verifyOtp(phone: string, otp: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (entry.expires < Date.now()) {
    otpStore.delete(phone);
    return false;
  }
  if (entry.otp !== otp) return false;
  otpStore.delete(phone);
  return true;
}

export function peekOtp(phone: string): string | null {
  // Dev-only: let the UI display the OTP for testing without real SMS.
  const entry = otpStore.get(phone);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.otp;
}
