"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "./splash-screen";
import { LoginScreen } from "./login-screen";
import { LandingPage } from "./landing-page";
import { AppShell } from "./app-shell";

const MIN_SPLASH_MS = 2000;
const LANDING_SEEN_KEY = "subtrack_landing_seen";

// Detect if the app is running in "standalone" mode — meaning it was
// installed as a PWA or launched as a TWA (Android app from Play Store).
// In standalone mode, the app has no browser address bar, so users
// already know what app they opened (they installed it deliberately).
function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  // PWA installed (Add to Home Screen) or TWA (Play Store)
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone
    (window.navigator as { standalone?: boolean }).standalone === true;
  // TWA from Play Store sends an android-app:// referrer
  const isTwa =
    typeof document !== "undefined" &&
    document.referrer.startsWith("android-app://");
  return standalone || isTwa;
}

export function RootGate() {
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  // Determine initial view:
  // - App users (PWA/TWA from Play Store) → login screen directly (they know the app)
  // - First-time web visitors → landing page (need context about the app)
  // - Returning web visitors → login screen (landing page already seen)
  // - Google reviewers (fresh browser) → landing page (for verification)
  const [view, setView] = useState<"loading" | "landing" | "login">(() => {
    if (typeof window === "undefined") return "loading";
    // App users skip the landing page entirely
    if (isStandaloneApp()) return "login";
    // Web visitors: show landing page only on first visit
    const hasSeenLanding = localStorage.getItem(LANDING_SEEN_KEY) === "true";
    return hasSeenLanding ? "login" : "landing";
  });

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
        document.cookie = "subpilot_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.reload();
        return;
      }
    }

    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Show splash screen during initial load
  if (loading || !splashDone || view === "loading") {
    return <SplashScreen />;
  }

  // Logged-in users go straight to the app
  if (user) return <AppShell />;

  // Logged-out visitors:
  // - First visit → landing page (then "Get Started" → login)
  // - Returning → login screen directly
  if (view === "landing") {
    return (
      <LandingPage
        onGetStarted={() => {
          // Remember that the user has seen the landing page — skip it next time
          localStorage.setItem(LANDING_SEEN_KEY, "true");
          setView("login");
        }}
      />
    );
  }

  return <LoginScreen />;
}
