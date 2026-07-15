"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Mail, Shield, TrendingDown, Gift, Brain, Check, ArrowRight,
} from "lucide-react";
import { SavvyMascot } from "./savvy-mascot";
import { GoogleLogo } from "./brand-logos";
import { Button } from "@/components/ui/button";

// Public landing page shown to visitors (and Google OAuth reviewers) before
// they sign in. Explains what SubTrack AI does so Google can verify the app.
export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    onGetStarted();
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-6 py-12 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mb-3 flex justify-center"
          >
            <SavvyMascot size={80} variant="happy" />
          </motion.div>

          <h1 className="text-3xl font-bold tracking-tight mb-2">
            SubTrack <span className="text-primary">AI</span>
          </h1>

          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-6">
            Meet <span className="font-semibold text-primary">Savvy</span> — your AI-powered subscription tracker.
            Track subscriptions, earn rewards, and save money automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => setShowLogin(true)}
              className="h-12 px-6"
            >
              Get Started <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3">
            Free to use · No credit card required
          </p>
        </div>
      </header>

      {/* Features section */}
      <main className="max-w-2xl mx-auto px-6 pb-12">
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
          <h2 className="text-lg font-semibold text-center mb-4">How it works</h2>
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
          <Button
            onClick={() => setShowLogin(true)}
            size="lg"
            className="h-12 px-8"
          >
            Start tracking for free <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-[10px] text-muted-foreground mt-3">
            By continuing, you agree to our{" "}
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>{" "}
            and{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <SavvyMascot size={28} variant="happy" />
            <span className="font-bold text-sm">SubTrack AI</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-foreground transition">Terms of Service</a>
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
    <div className="glass rounded-2xl p-4">
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
    <div className="flex items-start gap-3 glass rounded-2xl p-4">
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
