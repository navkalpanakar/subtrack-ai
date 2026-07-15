"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SavvyMascot } from "@/components/savvy-mascot";
import { motion } from "framer-motion";

function AuthBridgeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      try {
        // The NextAuth session cookie is set by the Google OAuth callback.
        // Fetch it to get the user's email.
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user?.email) {
          // Bridge to our token system
          const bridgeRes = await fetch("/api/auth/bridge-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: session.user.email }),
          });
          const bridgeData = await bridgeRes.json();

          if (bridgeData.token) {
            localStorage.setItem("subpilot_token", bridgeData.token);
            // Redirect to the app — it will now recognize the token
            window.location.href = "/app";
            return;
          }
        }
        // No session or bridge failed — go back to the app login
        window.location.href = "/app";
      } catch {
        window.location.href = "/app";
      }
    };
    run();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <SavvyMascot size={80} variant="excited" />
      </motion.div>
      <p className="text-sm text-muted-foreground mt-4">Signing you in…</p>
    </div>
  );
}

export default function AuthBridgePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthBridgeContent />
    </Suspense>
  );
}
