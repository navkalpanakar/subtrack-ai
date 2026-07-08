"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { useCurrencyStore } from "@/hooks/use-currency-store";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  );
  const initCurrency = useCurrencyStore((s) => s.init);
  // Initialize currency from localStorage on mount (client-side only)
  useEffect(() => {
    initCurrency();
  }, [initCurrency]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
