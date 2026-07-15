import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  issueAdminTokenSync,
} from "@/lib/admin-session";

// POST /api/admin/auth/login
// Body: { email, password }
// Returns: { token, admin: { id, email, role } }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    const password = body?.password as string | undefined;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const admin = await db.adminUser.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, admin.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = issueAdminTokenSync(admin.id, admin.email, admin.role);

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("[admin/login] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
