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
  signInEmail: (email: string, name?: string) => Promise<void>;
  signInOAuthPreview: (provider: "google" | "microsoft" | "apple") => Promise<{ token?: string; error?: string }>;
  sendEmailOtp: (email: string) => Promise<{ sent: boolean; devOtp?: string; error?: string }>;
  verifyEmailOtp: (email: string, otp: string, name?: string) => Promise<{ token?: string; error?: string }>;
  sendPhoneOtp: (phone: string) => Promise<{ sent: boolean; devOtp?: string }>;
  verifyPhoneOtp: (phone: string, otp: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Install a global fetch wrapper once: every request gets the token header.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const headers = new Headers(init?.headers || {});
        if (!headers.has("x-subpilot-token")) {
          headers.set("x-subpilot-token", token);
        }
        init = { ...init, headers };
      }
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Validate any existing token on mount.
  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      // defer to avoid synchronous setState in effect
      const t = setTimeout(() => !cancelled && setLoading(false), 0);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    fetch("/api/auth/me")
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

  const signInEmail = useCallback(async (email: string, name?: string) => {
    setLoading(true);
    const res = await fetch("/api/auth/email-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    const data: { token: string; user: SessionUser } = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setLoading(false);
  }, []);

  // Email-with-OTP verification flow (the new primary email login)
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

  const sendPhoneOtp = useCallback(async (phone: string) => {
    const res = await fetch("/api/auth/phone-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data: { sent: boolean; devOtp?: string } = await res.json();
    return data;
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, otp: string, name?: string) => {
    setLoading(true);
    const res = await fetch("/api/auth/phone-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp, name }),
    });
    const data: { token: string; user: SessionUser } = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setLoading(false);
  }, []);

  const signInOAuthPreview = useCallback(async (provider: "google" | "microsoft" | "apple") => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/oauth-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data: { token: string; user: SessionUser; error?: string } = await res.json();
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
      }
      setLoading(false);
      return data;
    } catch {
      setLoading(false);
      return { error: "Could not sign in" };
    }
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
    () => ({ user, loading, signInDemo, signInEmail, signInOAuthPreview, sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp, signOut }),
    [user, loading, signInDemo, signInEmail, signInOAuthPreview, sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
