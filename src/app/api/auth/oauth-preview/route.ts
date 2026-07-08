import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueToken } from "@/lib/token-store";
import { ensureUserProgress } from "@/lib/gamification";
import { logoForProvider } from "@/lib/logo";

// Preview OAuth sign-in. Used when real OAuth credentials aren't configured
// (no GOOGLE_CLIENT_ID / AZURE_AD_CLIENT_ID / APPLE_CLIENT_ID env vars).
// Creates (or finds) a user with a provider-specific email + links that
// provider to their account, so the full app experience is testable.
//
// In production with real OAuth env vars set, the NextAuth signIn() flow
// is used instead and this route is never called.

const PROVIDER_PROFILES: Record<string, { email: string; name: string; image: string | null }> = {
  google: {
    email: "google.user@gmail.com",
    name: "Google User",
    image: null,
  },
  microsoft: {
    email: "outlook.user@outlook.com",
    name: "Microsoft User",
    image: null,
  },
  apple: {
    email: "apple.user@privaterelay.appleid.com",
    name: "Apple User",
    image: null,
  },
};

export async function POST(req: NextRequest) {
  const { provider } = await req.json();
  if (!provider || !PROVIDER_PROFILES[provider]) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const profile = PROVIDER_PROFILES[provider];
  let user = await db.user.findUnique({ where: { email: profile.email } });
  const isNew = !user;
  if (!user) {
    user = await db.user.create({
      data: { email: profile.email, name: profile.name, image: profile.image },
    });
  }
  await ensureUserProgress(user.id);

  // Link the OAuth provider to this user's account
  await db.linkedAccount.upsert({
    where: { userId_provider: { userId: user.id, provider } },
    update: { identifier: profile.email },
    create: { userId: user.id, provider, identifier: profile.email },
  });
  // Also link email if not already linked
  await db.linkedAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: "email" } },
    update: {},
    create: { userId: user.id, provider: "email", identifier: profile.email },
  });

  const token = issueToken(user.id);
  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      image: user.image,
    },
    isNew,
    provider,
    preview: true,
  });
}
