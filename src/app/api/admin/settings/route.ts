import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireAdmin,
  requireAdminWrite,
  getAllSettings,
  setSettings,
  SETTING_DEFAULTS,
} from "@/lib/admin-session";

// GET /api/admin/settings → all settings (merged with defaults)
export async function GET(req: NextRequest) {
  const r = await requireAdmin(req);
  if (!r.ok) return r.response;

  const settings = await getAllSettings();
  return NextResponse.json({ settings, defaults: SETTING_DEFAULTS });
}

// PATCH /api/admin/settings → update settings
// Body: { settings: { ai_enabled: "false", ... } }
export async function PATCH(req: NextRequest) {
  const r = await requireAdminWrite(req);
  if (!r.ok) return r.response;

  const body = await req.json().catch(() => null);
  const incoming = body?.settings;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json(
      { error: "Body must be { settings: { ... } }" },
      { status: 400 }
    );
  }

  // Coerce all values to strings (frontend may send booleans/numbers).
  const updates: Record<string, string> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (typeof v === "boolean") updates[k] = v ? "true" : "false";
    else if (typeof v === "number") updates[k] = String(v);
    else if (typeof v === "string") updates[k] = v;
    // silently drop other types
  }

  await setSettings(updates);
  const settings = await getAllSettings();
  return NextResponse.json({ settings });
}
