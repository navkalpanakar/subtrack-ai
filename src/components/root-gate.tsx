"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "./splash-screen";
import { LoginScreen } from "./login-screen";
import { LandingPage } from "./landing-page";
import { AppShell } from "./app-shell";

const MIN_SPLASH_MS = 2000;

export function RootGate() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for auth_token in URL (from bridge redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get("auth_token");
    if (authToken) {
      localStorage.setItem("subpilot_token", authToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload();
      return;
    }

    // Check for subpilot_token cookie (set by NextAuth session callback for Google OAuth)
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "subpilot_token" && value) {
        localStorage.setItem("subpilot_token", value);
        // Delete the cookie (it's now in localStorage)
        document.cookie = "subpilot_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.reload();
        return;
      }
    }

    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Show splash screen during initial load
  if (loading || !splashDone) {
    return <SplashScreen />;
  }

  // Logged-in users go straight to the app
  if (user) return <AppShell />;

  // Logged-out visitors see the landing page first (public info for Google reviewers)
  // Clicking "Get Started" shows the login screen
  if (showLogin) return <LoginScreen />;
  return <LandingPage onGetStarted={() => setShowLogin(true)} />;
}
