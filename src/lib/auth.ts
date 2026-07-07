import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

// Google OAuth is enabled automatically when credentials are present in env.
// A guest/demo provider is always available so the app is usable today
// without external credentials — perfect for first-run & local preview.
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Guest",
    credentials: {
      email: { label: "Email", type: "email" },
      name: { label: "Name", type: "text" },
    },
    async authorize(credentials) {
      const email = credentials?.email || "guest@subpilot.app";
      const name = credentials?.name || "Guest User";
      let user = await db.user.findUnique({ where: { email } });
      if (!user) {
        user = await db.user.create({ data: { email, name } });
        await seedDemoSubscriptions(user.id);
      }
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (googleClientId && googleClientSecret) {
  providers.unshift(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async signIn({ user }) {
      // For Google OAuth: ensure user row exists in our DB.
      if (user?.email) {
        const existing = await db.user.findUnique({ where: { email: user.email } });
        if (!existing && user.email) {
          const created = await db.user.create({
            data: {
              email: user.email,
              name: user.name || null,
              image: user.image || null,
            },
          });
          await seedDemoSubscriptions(created.id);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.findUnique({ where: { email: user.email } });
        if (dbUser) token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: { signIn: "/" },
  secret: process.env.NEXTAUTH_SECRET || "subpilot-dev-secret-change-me",
};

// Seed a new user with realistic demo subscriptions so the dashboard
// is never empty on first run.
export async function seedDemoSubscriptions(userId: string) {
  const now = new Date();
  const inDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    return date;
  };
  const demos = [
    { name: "Netflix", provider: "Netflix", category: "Streaming", amount: 15.49, billingCycle: "monthly", nextBillingDate: inDays(3), logo: "https://logo.clearbit.com/netflix.com", color: "#E50914", cancelUrl: "https://www.netflix.com/cancelplan", usageTags: "streaming,movies" },
    { name: "Spotify Premium", provider: "Spotify", category: "Music", amount: 11.99, billingCycle: "monthly", nextBillingDate: inDays(7), logo: "https://logo.clearbit.com/spotify.com", color: "#1DB954", cancelUrl: "https://www.spotify.com/account/subscription/", usageTags: "music,audio" },
    { name: "YouTube Premium", provider: "Google", category: "Streaming", amount: 13.99, billingCycle: "monthly", nextBillingDate: inDays(12), logo: "https://logo.clearbit.com/youtube.com", color: "#FF0000", cancelUrl: "https://www.youtube.com/paid_memberships", usageTags: "streaming,music,videos" },
    { name: "iCloud+ 200GB", provider: "Apple", category: "Cloud", amount: 2.99, billingCycle: "monthly", nextBillingDate: inDays(18), logo: "https://logo.clearbit.com/apple.com", color: "#3693F3", cancelUrl: "https://support.apple.com/billing", usageTags: "cloud,storage" },
    { name: "Adobe Creative Cloud", provider: "Adobe", category: "Productivity", amount: 59.99, billingCycle: "monthly", nextBillingDate: inDays(22), logo: "https://logo.clearbit.com/adobe.com", color: "#FA0F00", cancelUrl: "https://account.adobe.com/plans", usageTags: "design,productivity" },
    { name: "Amazon Prime", provider: "Amazon", category: "Shopping", amount: 139.0, billingCycle: "yearly", nextBillingDate: inDays(45), logo: "https://logo.clearbit.com/amazon.com", color: "#FF9900", cancelUrl: "https://www.amazon.com/mc/yourmembership", usageTags: "shopping,streaming,delivery" },
    { name: "Notion Plus", provider: "Notion", category: "Productivity", amount: 10.0, billingCycle: "monthly", nextBillingDate: inDays(1), logo: "https://logo.clearbit.com/notion.so", color: "#111111", cancelUrl: "https://www.notion.so/my-integrations", usageTags: "productivity,notes" },
    { name: "ChatGPT Plus", provider: "OpenAI", category: "AI", amount: 20.0, billingCycle: "monthly", nextBillingDate: inDays(5), logo: "https://logo.clearbit.com/openai.com", color: "#10A37F", cancelUrl: "https://chat.openai.com/#settings/Subscription", usageTags: "ai,productivity" },
  ];
  for (const d of demos) {
    await db.subscription.create({ data: { userId, ...d } });
  }
}
