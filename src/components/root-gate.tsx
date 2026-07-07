"use client";

import { useSession } from "next-auth/react";
import { LoginScreen } from "./login-screen";
import { AppShell } from "./app-shell";

export function RootGate() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  return <AppShell />;
}
