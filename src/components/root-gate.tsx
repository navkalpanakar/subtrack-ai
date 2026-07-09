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
    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (loading || !splashDone) {
    return <SplashScreen />;
  }

  if (!user) return <LoginScreen />;
  return <AppShell />;
}
