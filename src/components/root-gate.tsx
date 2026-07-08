"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "./splash-screen";
import { LoginScreen } from "./login-screen";
import { AppShell } from "./app-shell";

const MIN_SPLASH_MS = 1600;

export function RootGate() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [nextAuthUser, setNextAuthUser] = useState<{ id: string; email: string; name: string | null; image: string | null } | null>(null);

  // Check for NextAuth session (Google OAuth) if no token exists
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("subpilot_token") : null;
    if (token) {
      const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
      return () => clearTimeout(t);
    }

    // No token — check if NextAuth has a session via /api/auth/me
    // (which now checks both token AND NextAuth session server-side)
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user?: { id: string; email: string; name: string | null; image: string | null } }) => {
        if (data?.user) {
          // NextAuth session exists (Google OAuth) — use it directly
          setNextAuthUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => {
        const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
        return () => clearTimeout(t);
      });

    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Splash shows while loading OR during the minimum display window
  if (loading || !splashDone) {
    return <SplashScreen />;
  }

  // If we have a NextAuth user (from Google OAuth) but no token user,
  // use the NextAuth user directly
  const effectiveUser = user || nextAuthUser;

  if (!effectiveUser) return <LoginScreen />;
  return <AppShell />;
}
