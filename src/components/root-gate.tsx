"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "./splash-screen";
import { LoginScreen } from "./login-screen";
import { AppShell } from "./app-shell";

const MIN_SPLASH_MS = 1600; // minimum display time for a polished reveal

export function RootGate() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [checkingNextAuth, setCheckingNextAuth] = useState(true);

  // Show splash for at least MIN_SPLASH_MS even if auth resolves faster,
  // so the brand reveal feels intentional (not a flash).
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Check if NextAuth has a session (from Google OAuth callback).
  // If so, bridge it to our token system by calling /api/auth/me
  // which will find the NextAuth session and return a token.
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("subpilot_token") : null;
    if (token) {
      setTimeout(() => setCheckingNextAuth(false), 0);
      return;
    }
    // No token — check if NextAuth has a session (Google OAuth redirect)
    fetch("/api/auth/session", { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((data: { user?: { email?: string; name?: string } }) => {
        if (data?.user?.email) {
          // NextAuth session exists — bridge it to our token system
          fetch("/api/auth/bridge-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.user.email }),
          })
            .then((r) => r.json())
            .then((bridgeData: { token?: string; user?: unknown }) => {
              if (bridgeData.token) {
                localStorage.setItem("subpilot_token", bridgeData.token);
                window.location.reload();
              } else {
                setTimeout(() => setCheckingNextAuth(false), 0);
              }
            })
            .catch(() => setTimeout(() => setCheckingNextAuth(false), 0));
        } else {
          setTimeout(() => setCheckingNextAuth(false), 0);
        }
      })
      .catch(() => setCheckingNextAuth(false));
  }, []);

  // Splash shows while loading OR during the minimum display window OR checking NextAuth
  if (loading || !splashDone || checkingNextAuth) {
    return <SplashScreen />;
  }

  if (!user) return <LoginScreen />;
  return <AppShell />;
}
