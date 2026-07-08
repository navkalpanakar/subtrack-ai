"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SavvyMascot } from "./savvy-mascot";
import { GoogleLogo } from "./brand-logos";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "main" | "email" | "otp";

export function LoginScreen() {
  const { signInDemo, sendEmailOtp, verifyEmailOtp } = useAuth();
  const [mode, setMode] = useState<Mode>("main");
  const [loading, setLoading] = useState<null | string>(null);

  // Detect which OAuth providers are configured (real credentials present).
  const [oauthProviders, setOauthProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        setOauthProviders(new Set(Object.keys(data)));
      })
      .catch(() => setOauthProviders(new Set()));
  }, []);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // OAuth handler — uses real NextAuth OAuth. Requires env vars to be set.
  // If not configured, shows a helpful toast telling the user to sign in
  // with email or demo instead.
  const handleGoogle = () => {
    if (oauthProviders.has("google")) {
      setLoading("google");
      signIn("google", { callbackUrl: "/auth-bridge" });
    } else {
      toast.error("Google sign-in is not configured yet. Use email or demo for now.");
    }
  };

  const handleDemo = async () => {
    setLoading("demo");
    try {
      await signInDemo();
    } catch {
      setLoading(null);
    }
  };

  const handleEmailSend = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading("email-send");
    try {
      const res = await sendEmailOtp(email);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.devOtp) {
        // Preview mode — no real email was sent, show the code for testing
        setDevOtp(res.devOtp);
        toast.success(`Preview code: ${res.devOtp}`);
      } else {
        // Real email was sent — don't show the code
        setDevOtp(null);
        toast.success("Verification code sent to your email!");
      }
      setMode("otp");
    } catch {
      toast.error("Could not send code");
    } finally {
      setLoading(null);
    }
  };

  const handleEmailVerify = async () => {
    if (otp.length < 4) {
      toast.error("Enter the 4-digit code");
      return;
    }
    setLoading("email-verify");
    try {
      const res = await verifyEmailOtp(email, otp, name || undefined);
      if (res.error) {
        toast.error(res.error);
        setLoading(null);
      }
    } catch {
      toast.error("Could not verify");
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mb-2"
            >
              <SavvyMascot size={72} variant="happy" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight">
              SubTrack <span className="text-primary">AI</span>
            </h1>
            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
              Meet <span className="font-semibold text-primary">Savvy</span> — track subscriptions,
              earn rewards, and save money automatically.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {mode === "main" && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2.5"
              >
                <button
                  onClick={() => setMode("email")}
                  disabled={loading !== null}
                  className="w-full h-12 rounded-xl bg-foreground text-background font-medium flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                >
                  <Mail className="h-5 w-5" />
                  Continue with Email
                </button>

                <div className="flex items-center gap-2 py-1">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">or</span>
                  <div className="h-px bg-border flex-1" />
                </div>

                {/* Google OAuth */}
                <button
                  onClick={handleGoogle}
                  disabled={loading !== null}
                  className="w-full h-12 rounded-xl border border-border bg-card hover:bg-accent font-medium flex items-center justify-center gap-3 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {loading === "google" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <GoogleLogo className="h-5 w-5" />
                  )}
                  Continue with Google
                </button>

                <button
                  onClick={handleDemo}
                  disabled={loading !== null}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 shadow-lg shadow-primary/30 mt-3"
                >
                  {loading === "demo" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Try the demo (1 tap)
                </button>

                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  Email verification required · Google sign-in available
                </p>
              </motion.div>
            )}

            {mode === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <BackButton onClick={() => setMode("main")} />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-primary" /> Continue with Email
                </div>
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSend()}
                  />
                  <Input
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button
                  onClick={handleEmailSend}
                  disabled={loading !== null || !email.includes("@")}
                  className="w-full h-11"
                >
                  {loading === "email-send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send verification code
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  We'll send a 4-digit code to verify your email before creating your account.
                </p>
              </motion.div>
            )}

            {mode === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <BackButton onClick={() => setMode("email")} />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-primary" /> Verify your email
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the code sent to <span className="font-medium text-foreground">{email}</span>
                </p>
                {devOtp && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-center">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wide">Preview code</p>
                    <p className="text-2xl font-bold tracking-[0.3em] text-amber-600 dark:text-amber-400">{devOtp}</p>
                  </div>
                )}
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="h-12 text-center text-2xl tracking-[0.5em]"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailVerify()}
                />
                <Button
                  onClick={handleEmailVerify}
                  disabled={loading !== null || otp.length < 4}
                  className="w-full h-11"
                >
                  {loading === "email-verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verify & create account
                </Button>
                <button
                  onClick={handleEmailSend}
                  className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
                >
                  Didn't get a code? Resend
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}
