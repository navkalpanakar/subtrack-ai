// Bootstrap the first AdminUser from env vars:
//
//   ADMIN_BOOTSTRAP_EMAIL="admin@subtrack.ai" \
//   ADMIN_BOOTSTRAP_PASSWORD="your_secure_password" \
//   bun run scripts/create-admin.ts
//
// Optional: ADMIN_BOOTSTRAP_ROLE (default: superadmin)
//
// If an admin with the given email already exists, the password is
// rotated to the new value (idempotent — safe to re-run).

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const role = process.env.ADMIN_BOOTSTRAP_ROLE || "superadmin";

  if (!email || !password) {
    console.error(
      "ERROR: ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD env vars are required."
    );
    console.error("");
    console.error("Usage:");
    console.error(
      "  ADMIN_BOOTSTRAP_EMAIL=\"admin@subtrack.ai\" ADMIN_BOOTSTRAP_PASSWORD=\"secret\" bun run scripts/create-admin.ts"
    );
    process.exit(1);
  }

  if (!["superadmin", "admin", "viewer"].includes(role)) {
    console.error(`ERROR: Invalid role "${role}". Must be superadmin | admin | viewer.`);
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("ERROR: ADMIN_BOOTSTRAP_PASSWORD must be at least 6 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) {
    await db.adminUser.update({
      where: { email },
      data: { passwordHash, role },
    });
    console.log(`Updated existing admin: ${email} (role=${role})`);
  } else {
    await db.adminUser.create({
      data: { email, passwordHash, role },
    });
    console.log(`Created admin: ${email} (role=${role})`);
  }

  console.log("");
  console.log("You can now sign in at /admin with these credentials.");
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
