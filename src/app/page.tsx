import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles, Mail, Shield, TrendingDown, Gift, Brain, ArrowRight,
} from "lucide-react";

// ROOT PAGE — This is what Google's crawler sees at https://subtrack.scanmymenu.in
// It is 100% server-rendered. NO client components, NO auth, NO splash screen.
// The actual SubTrack AI app lives at /app (client-rendered).
//
// This ensures Google's verification bot sees:
// - App name "SubTrack AI" in the H1 (matches OAuth consent screen)
// - App purpose clearly explained
// - No login wall

// Force dynamic rendering — prevents Next.js from serving a cached version
// to Google's crawler. Ensures Google always sees the latest content.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "SubTrack AI — AI-Powered Subscription Tracker",
  description:
    "SubTrack AI is an AI-powered subscription tracker that helps you monitor recurring payments, detect subscriptions from Gmail, get AI savings insights, and earn rewards. Track subscriptions, earn rewards, and save money automatically.",
  keywords: [
    "SubTrack AI",
    "subscription tracker",
    "AI finance",
    "save money",
    "cancel subscriptions",
    "renewal reminders",
  ],
  authors: [{ name: "SubTrack AI" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "SubTrack AI — AI-Powered Subscription Tracker",
    description:
      "SubTrack AI is an AI-powered subscription tracker. Track subscriptions, earn rewards, and save money automatically.",
    type: "website",
    url: "https://subtrack.scanmymenu.in",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD structured data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "SubTrack AI",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web, Android, iOS",
            description:
              "SubTrack AI is an AI-powered subscription tracker that helps you monitor recurring payments, detect subscriptions from Gmail, get AI savings insights, and earn rewards.",
            url: "https://subtrack.scanmymenu.in",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            publisher: {
              "@type": "Organization",
              name: "SubTrack AI",
            },
          }),
        }}
      />

      {/* Hero section */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        </div>

        {/* Top navigation bar with Privacy Policy link (prominent for Google verification) */}
        <nav className="relative z-20 max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-bold">
              S
            </div>
            <span className="font-bold text-sm">SubTrack AI</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition font-medium">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition font-medium">
              Terms
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-2xl mx-auto px-6 py-12 text-center">
          <div className="mb-3 flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
              S
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-2">
            SubTrack AI
          </h1>

          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-6">
            SubTrack AI is an AI-powered subscription tracker that helps you monitor
            recurring payments, detect subscriptions from Gmail, get AI savings insights,
            and earn rewards. Track subscriptions, earn rewards, and save money automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/app"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              Get Started <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-border bg-card text-foreground font-medium hover:bg-accent transition"
            >
              Privacy Policy
            </Link>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3">
            Free to use · No credit card required ·{" "}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
          </p>
        </div>
      </header>

      {/* About section — explicitly states the app name and purpose for Google verification */}
      <section className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-center mb-4">About SubTrack AI</h2>
        <p className="text-sm text-muted-foreground text-center leading-relaxed mb-3">
          <strong className="text-foreground">SubTrack AI</strong> is an AI-powered subscription tracker
          application that helps users monitor their recurring payments, detect subscriptions from their
          Gmail inbox, receive AI-powered savings insights, and earn rewards. The app allows users to
          track all their subscriptions in one dashboard, view monthly and yearly costs, get personalized
          recommendations to save money, and cancel unused services.
        </p>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          SubTrack AI is a finance application that supports 40+ currencies with automatic location-based
          detection. Users can sign in with email or Google, add subscriptions manually or via Gmail inbox
          scanning, and participate in gamified challenges to earn rewards while saving money.
        </p>
      </section>

      {/* Features section */}
      <main className="max-w-2xl mx-auto px-6 pb-12">
        <h2 className="text-lg font-semibold text-center mb-4">
          What SubTrack AI does
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard
            icon={<TrendingDown className="h-5 w-5 text-primary" />}
            title="Track subscriptions"
            description="Monitor all your recurring payments in one dashboard. See monthly and yearly costs at a glance."
          />
          <FeatureCard
            icon={<Brain className="h-5 w-5 text-primary" />}
            title="AI insights"
            description="Get personalized savings tips powered by AI. Find cheaper plans, student discounts, and bundle deals."
          />
          <FeatureCard
            icon={<Mail className="h-5 w-5 text-primary" />}
            title="Gmail inbox scan"
            description="Connect your Google account to auto-detect subscriptions from billing emails — no manual entry."
          />
          <FeatureCard
            icon={<Gift className="h-5 w-5 text-primary" />}
            title="Earn rewards"
            description="Complete challenges, spin the daily wheel, and climb the weekly leaderboard to win prizes."
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5 text-primary" />}
            title="Privacy first"
            description="Your data is encrypted and never sold. Delete your account anytime with one tap."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5 text-primary" />}
            title="Multi-currency"
            description="Automatic currency detection based on your location. Supports 40+ currencies worldwide."
          />
        </div>

        {/* How it works */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-center mb-4">How SubTrack AI works</h2>
          <div className="space-y-3">
            <Step
              num={1}
              title="Sign in with email or Google"
              description="Create a free account in seconds. Use email verification or Google sign-in."
            />
            <Step
              num={2}
              title="Add your subscriptions"
              description="Type a description, scan a receipt, or sync your Gmail inbox to auto-detect subscriptions."
            />
            <Step
              num={3}
              title="Get AI-powered savings tips"
              description="Savvy analyzes your subscriptions and suggests ways to save — annual plans, student discounts, and more."
            />
            <Step
              num={4}
              title="Earn rewards & save money"
              description="Cancel unused subscriptions, earn points, and climb the leaderboard to win free subscriptions."
            />
          </div>
        </section>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/app"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Start tracking for free <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
          <p className="text-[10px] text-muted-foreground mt-3">
            By continuing, you agree to our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>{" "}
            and{" "}
            <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-bold">
              S
            </div>
            <span className="font-bold text-sm">SubTrack AI</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition">Terms of Service</Link>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            © 2025 SubTrack AI · Outsmart your subscriptions
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ num, title, description }: { num: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
        {num}
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-0.5">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
