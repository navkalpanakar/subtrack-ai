"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Camera, MailSync, Trophy, Flame, Gift } from "@/components/icons";
import { useAuth } from "@/hooks/use-auth";
import { SavvyMascot } from "./savvy-mascot";

export function LoginScreen() {
  const { signInDemo } = useAuth();
  const [loading, setLoading] = useState<null | "google" | "guest">(null);

  const handleGoogle = () => {
    setLoading("google");
    signIn("google", { callbackUrl: "/" });
  };

  const handleGuest = async () => {
    setLoading("guest");
    try {
      await signInDemo();
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Logo + mascot */}
          <div className="flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mb-3"
            >
              <SavvyMascot size={88} variant="happy" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight">
              SubTrack <span className="text-primary">AI</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Meet <span className="font-semibold text-primary">Savvy</span> — your
              AI that tracks subscriptions, finds hidden savings, and rewards you
              for every smart move.
            </p>
          </div>

          {/* Value props with icons */}
          <div className="space-y-2 mb-8">
            {[
              { icon: Sparkles, title: "AI quick-add", desc: "Type, scan, or sync — Savvy does the rest" },
              { icon: Trophy, title: "Earn Savvy Points", desc: "Level up by tracking, cancelling & checking in" },
              { icon: Gift, title: "Unlock reward cards", desc: "Scratch to reveal real coupons & deals" },
              { icon: Flame, title: "Build your streak", desc: "Daily check-ins keep your savings momentum" },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="glass rounded-xl px-3 py-2.5 flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold">{title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              disabled={loading !== null}
              className="w-full h-12 rounded-xl bg-foreground text-background font-medium flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading === "google" ? (
                <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              Continue with Google
            </button>

            <button
              onClick={handleGuest}
              disabled={loading !== null}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow-lg shadow-primary/30"
            >
              {loading === "guest" ? (
                <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Start free — earn 10 points
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-5 leading-relaxed">
            Google sign-in uses real OAuth. The demo creates a local account with
            sample subscriptions so you can explore instantly.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
