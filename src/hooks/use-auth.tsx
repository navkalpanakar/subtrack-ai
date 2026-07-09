"use client";

// Token-based client session. Stores the auth token in localStorage and
// exposes it via a React context. A global fetch wrapper injects the
// `x-subpilot-token` header on every API call so all hooks inherit auth
// without per-call wiring. This bypasses cookies entirely (which break
// in cross-origin preview iframes due to third-party cookie blocking).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "subpilot_token";

type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  signInDemo: () => Promise<void>;
  sendEmailOtp: (email: string) => Promise<{ sent: boolean; devOtp?: string; error?: string }>;
  verifyEmailOtp: (email: string, otp: string, name?: string) => Promise<{ token?: string; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Install a global fetch wrapper once: every request gets the token header
  // AND includes credentials (cookies) so NextAuth sessions work too.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers = new Headers(init?.headers || {});
      if (token && !headers.has("x-subpilot-token")) {
        headers.set("x-subpilot-token", token);
      }
      // Always include credentials so the NextAuth cookie is sent
      init = { ...init, headers, credentials: "include" };
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Validate any existing token OR NextAuth session on mount.
  useEffect(() => {
    let cancelled = false;

    const existingToken = localStorage.getItem(TOKEN_KEY);

    // If we already have a token, validate it via /api/auth/me
    if (existingToken) {
      fetch("/api/auth/me", { credentials: "include" })
        .then((r) => r.json())
        .then((data: { user: SessionUser | null }) => {
          if (!cancelled) setUser(data.user);
        })
        .catch(() => {
          if (!cancelled) setUser(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    // No token — check NextAuth's /api/auth/session for a Google OAuth session.
    // NextAuth's session endpoint returns the session JSON including our appToken.
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { user?: { email?: string; name?: string; image?: string; appToken?: string } }) => {
        if (!cancelled && data?.user?.appToken) {
          // Found a NextAuth session with our appToken — store it
          localStorage.setItem(TOKEN_KEY, data.user.appToken);
          // Now fetch the user via /api/auth/me (which will find our token)
          return fetch("/api/auth/me", { credentials: "include" }).then((r) => r.json());
        }
        return { user: null };
      })
      .then((data: { user: SessionUser | null }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signInDemo = useCallback(async () => {
    setLoading(true);
    // Pass the user's detected currency so demo subscriptions use local prices.
    // Use a currency-specific email so switching countries creates a fresh
    // demo user with correct local prices (instead of reusing the old USD one).
    const currency = typeof window !== "undefined"
      ? localStorage.getItem("subtrack_currency") || "USD"
      : "USD";
    const email = `guest-${currency.toLowerCase()}@subtrack.ai`;
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: "Guest User",
        currency,
      }),
    });
    const data: { token: string; user: SessionUser } = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setLoading(false);
  }, []);

  // Email-with-OTP verification flow (the primary email login)
  const sendEmailOtp = useCallback(async (email: string) => {
    const res = await fetch("/api/auth/email-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data: { sent: boolean; devOtp?: string; error?: string } = await res.json();
    return data;
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, otp: string, name?: string) => {
    setLoading(true);
    const res = await fetch("/api/auth/email-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, name }),
    });
    const data: { token: string; user: SessionUser; error?: string } = await res.json();
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
    }
    setLoading(false);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInDemo, sendEmailOtp, verifyEmailOtp, signOut }),
    [user, loading, signInDemo, sendEmailOtp, verifyEmailOtp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
