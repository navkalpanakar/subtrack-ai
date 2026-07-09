"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "./splash-screen";
import { LoginScreen } from "./login-screen";
import { AppShell } from "./app-shell";

const MIN_SPLASH_MS = 2000;

export function RootGate() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // Check for auth_token in URL (from Google OAuth bridge redirect)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get("auth_token");
      if (authToken) {
        localStorage.setItem("subpilot_token", authToken);
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Reload so the auth hook picks up the token
        window.location.reload();
        return;
      }
    }

    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (loading || !splashDone) {
    return <SplashScreen />;
  }

  if (!user) return <LoginScreen />;
  return <AppShell />;
}
