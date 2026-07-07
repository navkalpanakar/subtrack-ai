"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type LevelInfo = {
  level: number;
  title: string;
  icon: string;
  minPoints: number;
  nextLevelPoints: number | null;
  progress: number;
};

export type Challenge = {
  id: string;
  title: string;
  detail: string;
  icon: string;
  points: number;
  goal: number;
  progress: number;
  completed: boolean;
};

export type RedeemedReward = {
  id: string;
  rewardId: string;
  title: string;
  icon: string;
  tier: string;
  revealed: boolean;
  offerTitle: string | null;
  offerUrl: string | null;
  offerDetail: string | null;
  redeemedAt: string;
};

export type Badge = {
  key: string;
  title: string;
  detail: string;
  icon: string;
  earnedAt: string;
};

export type Progress = {
  points: number;
  level: LevelInfo;
  streak: number;
  canCheckIn: boolean;
  savingsGoal: number;
  totalSaved: number;
  challenges: Challenge[];
  redeemedRewards: RedeemedReward[];
  badges: Badge[];
};

export type RewardTier = {
  id: string;
  title: string;
  detail: string;
  cost: number;
  tier: string;
  icon: string;
  affordable: boolean;
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((msg as { error?: string }).error || "Request failed");
  }
  return res.json() as Promise<T>;
}

export function useProgress() {
  return useQuery<Progress>({
    queryKey: ["progress"],
    queryFn: () => api("/api/progress"),
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ checkedIn: boolean; streak: number; points: number; earned?: number }>("/api/progress/check-in", { method: "POST" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      if (data.checkedIn && data.earned) {
        toast.success(`Checked in! +${data.earned} points 🔥`, {
          description: `${data.streak}-day streak`,
        });
      } else {
        toast("Already checked in today — come back tomorrow!");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRewardTiers() {
  return useQuery<RewardTier[]>({
    queryKey: ["reward-tiers"],
    queryFn: () => api("/api/rewards"),
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) =>
      api<{ id: string; title: string; icon: string; tier: string; revealed: boolean }>("/api/rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ rewardId }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["reward-tiers"] });
      toast.success(`${data.title} unlocked! Scratch to reveal 🎴`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useScratchReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ redeemedRewardId, provider }: { redeemedRewardId: string; provider?: string }) =>
      api<{ revealed: boolean; offerTitle: string; offerUrl: string; offerDetail: string; tier: string; icon: string }>(
        "/api/rewards/scratch",
        { method: "POST", body: JSON.stringify({ redeemedRewardId, provider }) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
