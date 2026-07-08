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

  // Check for auth_token in URL (from Google OAuth bridge redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get("auth_token");
    if (authToken) {
      localStorage.setItem("subpilot_token", authToken);
      // Remove the token from the URL (clean up)
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      // Reload so the auth hook picks up the new token
      window.location.reload();
      return;
    }

    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Splash shows while loading OR during the minimum display window
  if (loading || !splashDone) {
    return <SplashScreen />;
  }

  if (!user) return <LoginScreen />;
  return <AppShell />;
}
