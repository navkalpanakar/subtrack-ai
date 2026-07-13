"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Subscription = {
  id: string;
  name: string;
  provider: string;
  category: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextBillingDate: string;
  startDate: string | null;
  status: string;
  logo: string | null;
  color: string | null;
  notes: string | null;
  usageTags: string;
  cancelUrl: string | null;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "Request failed");
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function useSubscriptions() {
  return useQuery<Subscription[]>({
    queryKey: ["subscriptions"],
    queryFn: () => api("/api/subscriptions"),
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Subscription>) =>
      api("/api/subscriptions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subscription> }) =>
      api(`/api/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/subscriptions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
      toast.success("Subscription removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export type Insight = {
  type: "saving" | "alert" | "tip" | "overlap";
  title: string;
  detail: string;
  potentialSaving?: number;
  provider?: string;
  action?: "find_annual" | "find_student" | "find_alternative" | "cancel" | "downgrade" | "search_offer";
};

export function useInsights(currency?: string) {
  return useQuery<Insight[]>({
    queryKey: ["insights", currency],
    queryFn: () => api(`/api/ai/insights${currency ? `?currency=${currency}` : ""}`),
    // Insights fetch live web prices which can take 20-40s — allow up to 90s
    staleTime: 5 * 60 * 1000, // cache for 5 min to avoid re-fetching
    retry: 1,
  });
}

export async function parseNaturalLanguage(text: string, currency: string) {
  return api<{
    name: string;
    provider: string;
    category: string;
    amount: number | null;
    currency: string;
    billingCycle: string | null;
    nextBillingDate: string | null;
    notes?: string;
    verification?: {
      needsVerification: boolean;
      userAmount: number | null;
      expectedAmount: number | null;
      reason: string;
    } | null;
  }>("/api/ai/parse", { method: "POST", body: JSON.stringify({ text, currency }) });
}

export async function transcribeAudio(audio: string) {
  return api<{ text: string }>("/api/ai/transcribe", {
    method: "POST",
    body: JSON.stringify({ audio }),
  });
}

export async function scanInbox(provider: "gmail" | "outlook" | "apple") {
  const url =
    provider === "gmail"
      ? "/api/scan/gmail"
      : provider === "outlook"
      ? "/api/scan/outlook"
      : "/api/scan/apple";
  return api<{
    connected: boolean;
    scanSource?: string;
    error?: string;
    message?: string;
    detected: Array<Record<string, unknown>>;
  }>(url);
}

// Checks whether the user has an active Google OAuth session (required for
// Gmail inbox sync). Email/OTP users return connected:false.
export async function checkGmailConnection() {
  return api<{ connected: boolean; reason?: string; message?: string; email?: string | null }>(
    "/api/scan/gmail/status"
  );
}

export async function scanReceipt(image: string) {
  return api<{ subscriptions: Array<Record<string, unknown>> }>(
    "/api/ai/scan-receipt",
    { method: "POST", body: JSON.stringify({ image }) }
  );
}

export type Suggestion = {
  correctedText: string;
  provider: string;
  reason: string;
};

export async function fetchSuggestions(text: string) {
  if (!text || text.trim().length < 2) {
    return { hasTypo: false, suggestions: [] as Suggestion[] };
  }
  try {
    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return {
      hasTypo: data.hasTypo || false,
      suggestions: (data.suggestions || []) as Suggestion[],
    };
  } catch {
    return { hasTypo: false, suggestions: [] as Suggestion[] };
  }
}

export async function scanEmail(content: string) {
  return api<{ subscriptions: Array<Record<string, unknown>> }>(
    "/api/email/scan",
    { method: "POST", body: JSON.stringify({ content }) }
  );
}

export type Offer = {
  provider: string;
  title: string;
  detail: string;
  url: string;
  validUntil?: string;
};

export async function fetchOffers(provider: string) {
  return api<{ offers: Offer[] }>("/api/ai/offers", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}
