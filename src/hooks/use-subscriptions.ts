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
};

export function useInsights() {
  return useQuery<Insight[]>({
    queryKey: ["insights"],
    queryFn: () => api("/api/ai/insights"),
  });
}

export async function parseNaturalLanguage(text: string) {
  return api<{
    name: string;
    provider: string;
    category: string;
    amount: number | null;
    currency: string;
    billingCycle: string | null;
    nextBillingDate: string | null;
    notes?: string;
  }>("/api/ai/parse", { method: "POST", body: JSON.stringify({ text }) });
}

export async function scanReceipt(image: string) {
  return api<{ subscriptions: Array<Record<string, unknown>> }>(
    "/api/ai/scan-receipt",
    { method: "POST", body: JSON.stringify({ image }) }
  );
}

export async function scanEmail(content: string) {
  return api<{ subscriptions: Array<Record<string, unknown>> }>(
    "/api/email/scan",
    { method: "POST", body: JSON.stringify({ content }) }
  );
}

export async function scanGmail() {
  return api<{
    connected: boolean;
    scanSource: string;
    detected: Array<Record<string, unknown>>;
  }>("/api/scan/gmail");
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
