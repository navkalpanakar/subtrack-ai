import { RootGate } from "@/components/root-gate";
import Link from "next/link";

// The root page renders the client-side app (RootGate) for real users,
// but also includes server-rendered content for Google's crawlers:
// 1. JSON-LD structured data (tells Google the app name + purpose)
// 2. <noscript> block with full app info (Google processes this)
// This ensures Google can verify the app name "SubTrack AI" and purpose
// even though the main app is client-rendered.

const appInfo = {
  name: "SubTrack AI",
  description:
    "SubTrack AI is an AI-powered subscription tracker that helps you monitor recurring payments, detect subscriptions from Gmail, get AI savings insights, and earn rewards. Track subscriptions, earn rewards, and save money automatically.",
  url: "https://subtrack.scanmymenu.in",
};

export default function Page() {
  return (
    <>
      {/* JSON-LD structured data — Google uses this to identify the app */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: appInfo.name,
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web, Android, iOS",
            description: appInfo.description,
            url: appInfo.url,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            publisher: {
              "@type": "Organization",
              name: appInfo.name,
            },
          }),
        }}
      />

      {/* Server-rendered content for crawlers (hidden from users with JS) */}
      <noscript>
        <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
          <h1>SubTrack AI</h1>
          <p>
            SubTrack AI is an AI-powered subscription tracker that helps you monitor
            recurring payments, detect subscriptions from Gmail, get AI savings insights,
            and earn rewards. Track subscriptions, earn rewards, and save money automatically.
          </p>

          <h2>What SubTrack AI does</h2>
          <ul>
            <li><strong>Track subscriptions</strong> — Monitor all your recurring payments in one dashboard. See monthly and yearly costs at a glance.</li>
            <li><strong>AI insights</strong> — Get personalized savings tips powered by AI. Find cheaper plans, student discounts, and bundle deals.</li>
            <li><strong>Gmail inbox scan</strong> — Connect your Google account to auto-detect subscriptions from billing emails — no manual entry.</li>
            <li><strong>Earn rewards</strong> — Complete challenges, spin the daily wheel, and climb the weekly leaderboard to win prizes.</li>
            <li><strong>Privacy first</strong> — Your data is encrypted and never sold. Delete your account anytime with one tap.</li>
            <li><strong>Multi-currency</strong> — Automatic currency detection based on your location. Supports 40+ currencies worldwide.</li>
          </ul>

          <h2>How SubTrack AI works</h2>
          <ol>
            <li><strong>Sign in with email or Google</strong> — Create a free account in seconds.</li>
            <li><strong>Add your subscriptions</strong> — Type a description, scan a receipt, or sync your Gmail inbox.</li>
            <li><strong>Get AI-powered savings tips</strong> — Savvy analyzes your subscriptions and suggests ways to save.</li>
            <li><strong>Earn rewards &amp; save money</strong> — Cancel unused subscriptions, earn points, and climb the leaderboard.</li>
          </ol>

          <p>
            <a href="/">Get started with SubTrack AI</a>
          </p>
          <p>
            <a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms of Service</a>
          </p>
          <p>© 2025 SubTrack AI · Outsmart your subscriptions</p>
        </div>
      </noscript>

      {/* Client-side app for real users */}
      <RootGate />
    </>
  );
}
