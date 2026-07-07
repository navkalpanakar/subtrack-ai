// Server-side in-memory token store for the demo session flow.
// This bypasses cookies entirely (which break in cross-origin preview
// iframes due to third-party cookie blocking) by issuing an opaque
// token that the client stores in localStorage and sends as a header.

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type Entry = { userId: string; expires: number };

// Persist across hot reloads in dev.
const g = globalThis as unknown as { __subpilotTokens?: Map<string, Entry> };
const store: Map<string, Entry> = g.__subpilotTokens ?? new Map();
g.__subpilotTokens = store;

export function issueToken(userId: string): string {
  const token =
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2);
  store.set(token, { userId, expires: Date.now() + TOKEN_TTL_MS });
  return token;
}

export function getUserIdFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(token);
    return null;
  }
  return entry.userId;
}

export function revokeToken(token: string | null | undefined): void {
  if (token) store.delete(token);
}
