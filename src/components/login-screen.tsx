"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Phone, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SavvyMascot } from "./savvy-mascot";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "main" | "email" | "phone" | "otp";

export function LoginScreen() {
  const { signInDemo, signInEmail, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [mode, setMode] = useState<Mode>("main");
  const [loading, setLoading] = useState<null | string>(null);

  // Email form
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Phone form
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const handleGoogle = () => {
    setLoading("google");
    signIn("google", { callbackUrl: "/" });
  };
  const handleMicrosoft = () => {
    setLoading("microsoft");
    signIn("azure-ad", { callbackUrl: "/" });
  };
  const handleApple = () => {
    setLoading("apple");
    signIn("apple", { callbackUrl: "/" });
  };

  const handleDemo = async () => {
    setLoading("demo");
    try {
      await signInDemo();
    } catch {
      setLoading(null);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setLoading("email");
    try {
      await signInEmail(email, name || undefined);
    } catch {
      toast.error("Could not sign in");
      setLoading(null);
    }
  };

  const handlePhoneSend = async () => {
    if (phone.length < 6) {
      toast.error("Enter a valid phone number");
      return;
    }
    setLoading("phone-send");
    try {
      const res = await sendPhoneOtp(phone);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
        toast.success(`Dev OTP: ${res.devOtp} (no real SMS in preview)`);
      }
      setMode("otp");
    } catch {
      toast.error("Could not send code");
    } finally {
      setLoading(null);
    }
  };

  const handlePhoneVerify = async () => {
    if (otp.length < 4) {
      toast.error("Enter the 4-digit code");
      return;
    }
    setLoading("phone-verify");
    try {
      await verifyPhoneOtp(phone, otp, name || undefined);
    } catch {
      toast.error("Invalid code");
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
          {/* Logo + mascot */}
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
            {/* ─── Main auth menu ─── */}
            {mode === "main" && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-2.5"
              >
                {/* Email */}
                <button
                  onClick={() => setMode("email")}
                  disabled={loading !== null}
                  className="w-full h-12 rounded-xl bg-foreground text-background font-medium flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                >
                  <Mail className="h-5 w-5" />
                  Continue with Email
                </button>

                {/* Phone */}
                <button
                  onClick={() => setMode("phone")}
                  disabled={loading !== null}
                  className="w-full h-12 rounded-xl border border-border bg-card hover:bg-accent font-medium flex items-center justify-center gap-3 active:scale-[0.98] transition disabled:opacity-60"
                >
                  <Phone className="h-5 w-5" />
                  Continue with Phone
                </button>

                {/* Divider */}
                <div className="flex items-center gap-2 py-1">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">or</span>
                  <div className="h-px bg-border flex-1" />
                </div>

                {/* OAuth providers */}
                <div className="grid grid-cols-3 gap-2">
                  <OAuthButton label="Google" color="#EA4335" onClick={handleGoogle} loading={loading === "google"} />
                  <OAuthButton label="Microsoft" color="#00A4EF" onClick={handleMicrosoft} loading={loading === "microsoft"} />
                  <OAuthButton label="Apple" color="#111111" onClick={handleApple} loading={loading === "apple"} />
                </div>

                {/* Demo */}
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
                  Sign up with any method — link others later to sync more inboxes.
                </p>
              </motion.div>
            )}

            {/* ─── Email mode ─── */}
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
                  />
                  <Input
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button
                  onClick={handleEmailSubmit}
                  disabled={loading !== null || !email.includes("@")}
                  className="w-full h-11"
                >
                  {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Continue
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Passwordless — we'll create your account instantly.
                </p>
              </motion.div>
            )}

            {/* ─── Phone mode ─── */}
            {mode === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <BackButton onClick={() => setMode("main")} />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4 text-primary" /> Continue with Phone
                </div>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                />
                <Input
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
                <Button
                  onClick={handlePhoneSend}
                  disabled={loading !== null || phone.length < 6}
                  className="w-full h-11"
                >
                  {loading === "phone-send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                  Send code
                </Button>
              </motion.div>
            )}

            {/* ─── OTP mode ─── */}
            {mode === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <BackButton onClick={() => setMode("phone")} />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-primary" /> Enter the code
                </div>
                <p className="text-xs text-muted-foreground">
                  Sent to <span className="font-medium text-foreground">{phone}</span>
                </p>
                {devOtp && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-center">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wide">Preview OTP</p>
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
                />
                <Button
                  onClick={handlePhoneVerify}
                  disabled={loading !== null || otp.length < 4}
                  className="w-full h-11"
                >
                  {loading === "phone-verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verify & continue
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}

function OAuthButton({
  label, color, onClick, loading,
}: {
  label: string; color: string; onClick: () => void; loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="h-12 rounded-xl border border-border bg-card hover:bg-accent flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="h-5 w-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: color }}>
          {label[0]}
        </div>
      )}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
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
