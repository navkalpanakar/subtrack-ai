"use client";

import { useAuth } from "@/hooks/use-auth";
import { LoginScreen } from "./login-screen";
import { AppShell } from "./app-shell";

export function RootGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  return <AppShell />;
}
