// Admin/CRM authentication helpers — COMPLETELY SEPARATE from the
// user-facing auth (src/lib/session.ts, src/lib/token-store.ts).
//
// - Header:   `x-admin-token`   (NOT x-subpilot-token)
// - localStorage key: `admin_token` (NOT subpilot_token)
// - Storage: in-memory Map keyed by opaque token (survives hot reloads)
// - Passwords: hashed with bcryptjs
// - Roles:    superadmin | admin | viewer
//
// We deliberately keep this simple and self-contained — no NextAuth
// dependency, no shared cookies — so an admin compromise can never
// leak user sessions and vice versa.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type AdminEntry = {
  adminId: string;
  email: string;
  role: string;
  expires: number;
};

// Persist across hot reloads in dev.
const g = globalThis as unknown as { __adminTokens?: Map<string, AdminEntry> };
const store: Map<string, AdminEntry> = g.__adminTokens ?? new Map();
g.__adminTokens = store;

const ADMIN_TOKEN_HEADER = "x-admin-token";

// ─── Token issuance / verification ────────────────────────────────────

function randomToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export function signAdminToken(adminId: string): { token: string } {
  // Look up the admin so we can carry role/email in memory (avoids a
  // DB hit on every request). If the admin was deleted mid-session,
  // verification will fail naturally.
  return { token: signAdminTokenForAdmin(adminId) };
}

async function signAdminTokenForAdmin(adminId: string): Promise<string> {
  // Synchronous-ish: we issue the token first, then enrich it.
  const token = randomToken();
  let entry: AdminEntry;
  const admin = await db.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, role: true },
  });
  if (!admin) {
    // Shouldn't happen — caller just authenticated. Still, store minimal.
    entry = { adminId, email: "", role: "admin", expires: Date.now() + TOKEN_TTL_MS };
  } else {
    entry = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      expires: Date.now() + TOKEN_TTL_MS,
    };
  }
  store.set(token, entry);
  return token;
}

// Synchronous wrapper that uses a placeholder enrichment when called
// from request handlers that can't await. Most callers should prefer
// `getAdminId(req)` which is async and re-checks the DB role.
export function issueAdminTokenSync(adminId: string, email: string, role: string): string {
  const token = randomToken();
  store.set(token, {
    adminId,
    email,
    role,
    expires: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

export function verifyAdminToken(token: string | null | undefined): AdminEntry | null {
  if (!token) return null;
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(token);
    return null;
  }
  return entry;
}

export function revokeAdminToken(token: string | null | undefined): void {
  if (token) store.delete(token);
}

// ─── Request helpers ─────────────────────────────────────────────────

export async function getAdminId(
  req: NextRequest
): Promise<{ id: string; email: string; role: string } | null> {
  const token = req.headers.get(ADMIN_TOKEN_HEADER);
  const entry = verifyAdminToken(token);
  if (!entry) return null;
  // Re-validate the admin still exists + role hasn't been demoted.
  const admin = await db.adminUser.findUnique({
    where: { id: entry.adminId },
    select: { id: true, email: true, role: true },
  });
  if (!admin) {
    store.delete(token!);
    return null;
  }
  // Refresh role in memory in case it changed since issuance.
  entry.role = admin.role;
  return { id: admin.id, email: admin.email, role: admin.role };
}

// Returns the admin or a 401 NextResponse.
export async function requireAdmin(
  req: NextRequest
): Promise<
  { ok: true; admin: { id: string; email: string; role: string } } |
  { ok: false; response: NextResponse }
> {
  const admin = await getAdminId(req);
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized — admin token required" },
        { status: 401 }
      ),
    };
  }
  return { ok: true, admin };
}

// Stricter: requires admin or superadmin (excludes viewer).
export async function requireAdminWrite(
  req: NextRequest
): Promise<
  { ok: true; admin: { id: string; email: string; role: string } } |
  { ok: false; response: NextResponse }
> {
  const r = await requireAdmin(req);
  if (!r.ok) return r;
  if (r.admin.role === "viewer") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden — viewer role cannot modify data" },
        { status: 403 }
      ),
    };
  }
  return r;
}

// ─── Password helpers ────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Settings helpers ────────────────────────────────────────────────

export const SETTING_DEFAULTS: Record<string, string> = {
  ai_enabled: "true",
  gamification_enabled: "true",
  gmail_scan_enabled: "true",
  default_currency: "USD",
  freemium_sub_limit: "3",
  maintenance_mode: "false",
};

export async function getSetting(key: string): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? SETTING_DEFAULTS[key] ?? "";
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function setSettings(updates: Record<string, string>): Promise<void> {
  await db.$transaction(
    Object.entries(updates).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
}
