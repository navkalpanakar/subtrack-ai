"use client";

// Admin/CRM authentication context — completely separate from the
// user-facing useAuth() in src/hooks/use-auth.tsx.
//
// - localStorage key: `admin_token`
// - Header:           `x-admin-token`
// - All admin API calls should go through `adminFetch()` (below) so
//   the token is automatically attached. This avoids touching the
//   global fetch wrapper (which the user-side AuthProvider owns).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const TOKEN_KEY = "admin_token";

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type AdminAuthState = {
  admin: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  /** fetch wrapper that auto-attaches x-admin-token */
  adminFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate any existing admin token on mount.
  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem(TOKEN_KEY);

    const validate = async (): Promise<{ admin?: AdminUser } | null> => {
      if (!token) return null;
      try {
        const r = await fetch("/api/admin/auth/me", {
          headers: { "x-admin-token": token },
        });
        if (!r.ok) return null;
        return (await r.json()) as { admin?: AdminUser };
      } catch {
        return null;
      }
    };

    validate().then((data) => {
      if (cancelled) return;
      if (data?.admin) {
        setAdmin(data.admin);
      } else if (token) {
        localStorage.removeItem(TOKEN_KEY);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const adminFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers = new Headers(init?.headers || {});
      if (token && !headers.has("x-admin-token")) {
        headers.set("x-admin-token", token);
      }
      return fetch(input, { ...init, headers });
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/admin/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });
        const data: { token?: string; admin?: AdminUser; error?: string } = await res.json();
        if (!res.ok || !data.token || !data.admin) {
          return { ok: false, error: data.error || "Login failed" };
        }
        localStorage.setItem(TOKEN_KEY, data.token);
        setAdmin(data.admin);
        return { ok: true };
      } catch (e) {
        console.error("[admin signIn]", e);
        return { ok: false, error: "Network error" };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch("/api/admin/auth/logout", {
        method: "POST",
        headers: { "x-admin-token": token },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, loading, signIn, signOut, adminFetch }),
    [admin, loading, signIn, signOut, adminFetch]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminProvider");
  return ctx;
}

// Re-export for convenience in components that don't want to use the hook.
export { TOKEN_KEY as ADMIN_TOKEN_KEY };
