import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";

// Google OAuth is enabled when env vars are present.
// Email OTP is the primary auth method (always available).
// Demo is for testing.
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
      const email = credentials?.email || "guest@subtrack.ai";
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
  // Trust the reverse-proxy (Caddy gateway) forwarded headers so NextAuth
  // builds callback URLs from the public-facing host instead of the
  // internal localhost:3000. Fixes "localhost refused to connect" after
  // sign-in when accessed through the preview gateway.
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ user }) {
      // For Google OAuth: ensure user row exists in our DB.
      // Don't seed demo data — Google users start with an empty dashboard.
      if (user?.email) {
        const existing = await db.user.findUnique({ where: { email: user.email } });
        if (!existing && user.email) {
          await db.user.create({
            data: {
              email: user.email,
              name: user.name || null,
              image: user.image || null,
            },
          });
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
// is never empty on first run. Amounts are localized to the user's currency.
export async function seedDemoSubscriptions(userId: string, currency = "USD") {
  const now = new Date();
  const inDays = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    return date;
  };

  // Realistic subscription prices per currency (approximate local plan prices)
  const PRICES: Record<string, Record<string, { amount: number; cycle: string }>> = {
    INR: {
      Netflix: { amount: 199, cycle: "monthly" },
      "Spotify Premium": { amount: 119, cycle: "monthly" },
      "YouTube Premium": { amount: 129, cycle: "monthly" },
      "iCloud+ 200GB": { amount: 75, cycle: "monthly" },
      "Adobe Creative Cloud": { amount: 1675, cycle: "monthly" },
      "Amazon Prime": { amount: 1499, cycle: "yearly" },
      "Notion Plus": { amount: 800, cycle: "monthly" },
      "ChatGPT Plus": { amount: 195, cycle: "monthly" },
    },
    USD: {
      Netflix: { amount: 15.49, cycle: "monthly" },
      "Spotify Premium": { amount: 11.99, cycle: "monthly" },
      "YouTube Premium": { amount: 13.99, cycle: "monthly" },
      "iCloud+ 200GB": { amount: 2.99, cycle: "monthly" },
      "Adobe Creative Cloud": { amount: 59.99, cycle: "monthly" },
      "Amazon Prime": { amount: 139.0, cycle: "yearly" },
      "Notion Plus": { amount: 10.0, cycle: "monthly" },
      "ChatGPT Plus": { amount: 20.0, cycle: "monthly" },
    },
    GBP: {
      Netflix: { amount: 10.99, cycle: "monthly" },
      "Spotify Premium": { amount: 11.99, cycle: "monthly" },
      "YouTube Premium": { amount: 11.99, cycle: "monthly" },
      "iCloud+ 200GB": { amount: 2.49, cycle: "monthly" },
      "Adobe Creative Cloud": { amount: 51.98, cycle: "monthly" },
      "Amazon Prime": { amount: 95.0, cycle: "yearly" },
      "Notion Plus": { amount: 8.0, cycle: "monthly" },
      "ChatGPT Plus": { amount: 18.0, cycle: "monthly" },
    },
    EUR: {
      Netflix: { amount: 12.99, cycle: "monthly" },
      "Spotify Premium": { amount: 11.99, cycle: "monthly" },
      "YouTube Premium": { amount: 11.99, cycle: "monthly" },
      "iCloud+ 200GB": { amount: 2.99, cycle: "monthly" },
      "Adobe Creative Cloud": { amount: 59.99, cycle: "monthly" },
      "Amazon Prime": { amount: 89.0, cycle: "yearly" },
      "Notion Plus": { amount: 9.0, cycle: "monthly" },
      "ChatGPT Plus": { amount: 18.0, cycle: "monthly" },
    },
  };

  // Fallback: convert from USD at roughly 1:1 for unknown currencies
  const priceTable = PRICES[currency] || PRICES.USD;

  const demos = [
    { name: "Netflix", provider: "Netflix", category: "Streaming", amount: priceTable["Netflix"].amount, billingCycle: priceTable["Netflix"].cycle, nextBillingDate: inDays(3), logo: "https://logo.clearbit.com/netflix.com", color: "#E50914", cancelUrl: "https://www.netflix.com/cancelplan", usageTags: "streaming,movies" },
    { name: "Spotify Premium", provider: "Spotify", category: "Music", amount: priceTable["Spotify Premium"].amount, billingCycle: priceTable["Spotify Premium"].cycle, nextBillingDate: inDays(7), logo: "https://logo.clearbit.com/spotify.com", color: "#1DB954", cancelUrl: "https://www.spotify.com/account/subscription/", usageTags: "music,audio" },
    { name: "YouTube Premium", provider: "Google", category: "Streaming", amount: priceTable["YouTube Premium"].amount, billingCycle: priceTable["YouTube Premium"].cycle, nextBillingDate: inDays(12), logo: "https://logo.clearbit.com/youtube.com", color: "#FF0000", cancelUrl: "https://www.youtube.com/paid_memberships", usageTags: "streaming,music,videos" },
    { name: "iCloud+ 200GB", provider: "Apple", category: "Cloud", amount: priceTable["iCloud+ 200GB"].amount, billingCycle: priceTable["iCloud+ 200GB"].cycle, nextBillingDate: inDays(18), logo: "https://logo.clearbit.com/apple.com", color: "#3693F3", cancelUrl: "https://support.apple.com/billing", usageTags: "cloud,storage" },
    { name: "Adobe Creative Cloud", provider: "Adobe", category: "Productivity", amount: priceTable["Adobe Creative Cloud"].amount, billingCycle: priceTable["Adobe Creative Cloud"].cycle, nextBillingDate: inDays(22), logo: "https://logo.clearbit.com/adobe.com", color: "#FA0F00", cancelUrl: "https://account.adobe.com/plans", usageTags: "design,productivity" },
    { name: "Amazon Prime", provider: "Amazon", category: "Shopping", amount: priceTable["Amazon Prime"].amount, billingCycle: priceTable["Amazon Prime"].cycle, nextBillingDate: inDays(45), logo: "https://logo.clearbit.com/amazon.com", color: "#FF9900", cancelUrl: "https://www.amazon.com/mc/yourmembership", usageTags: "shopping,streaming,delivery" },
    { name: "Notion Plus", provider: "Notion", category: "Productivity", amount: priceTable["Notion Plus"].amount, billingCycle: priceTable["Notion Plus"].cycle, nextBillingDate: inDays(1), logo: "https://logo.clearbit.com/notion.so", color: "#111111", cancelUrl: "https://www.notion.so/my-integrations", usageTags: "productivity,notes" },
    { name: "ChatGPT Plus", provider: "OpenAI", category: "AI", amount: priceTable["ChatGPT Plus"].amount, billingCycle: priceTable["ChatGPT Plus"].cycle, nextBillingDate: inDays(5), logo: "https://logo.clearbit.com/openai.com", color: "#10A37F", cancelUrl: "https://chat.openai.com/#settings/Subscription", usageTags: "ai,productivity" },
  ];
  for (const d of demos) {
    await db.subscription.create({ data: { userId, currency, ...d } });
  }
}
