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

export type LinkedAccounts = {
  linked: Array<{ provider: string; identifier: string }>;
  google: boolean;
  googleEmail?: string | null;
  email: boolean;
  phone: boolean;
};

export type SpinState = {
  canSpin: boolean;
  todayPoints: number;
  nextSpinAt: string | null;
  wheel: number[];
};

export type SpinResult = {
  spun: boolean;
  points: number;
  index?: number;
  message?: string;
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  level: number;
  isCurrentUser: boolean;
};

export type Leaderboard = {
  entries: LeaderboardEntry[];
  myRank: number;
  totalUsers: number;
  prize: string;
  resetsIn: string;
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

export function useLinkedAccounts() {
  return useQuery<LinkedAccounts>({
    queryKey: ["linked-accounts"],
    queryFn: () => api("/api/account/linked"),
  });
}

export function useLinkAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, identifier }: { provider: string; identifier?: string }) =>
      api("/api/account/link", { method: "POST", body: JSON.stringify({ provider, identifier }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linked-accounts"] });
    },
  });
}

export function useUnlinkAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) =>
      api(`/api/account/link?provider=${encodeURIComponent(provider)}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linked-accounts"] });
    },
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ checkedIn: boolean; streak: number; points: number; earned?: number }>("/api/progress/check-in", { method: "POST" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      if (data.checkedIn && data.earned) {
        toast.success(`Checked in! +${data.earned} points 🔥`, { description: `${data.streak}-day streak` });
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

// ─── Games ─────────────────────────────────────────────────────
export function useSpinState() {
  return useQuery<SpinState>({
    queryKey: ["spin-state"],
    queryFn: () => api("/api/games/spin"),
  });
}

export function useSpin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claim?: boolean) =>
      api<SpinResult>(`/api/games/spin${claim ? "?claim=true" : ""}`, { method: "POST" }),
    onSuccess: (data) => {
      // Only invalidate queries when claiming (after animation) so the
      // points balance doesn't jump before the wheel stops.
      if (data.claimed || !data.spun) {
        qc.invalidateQueries({ queryKey: ["progress"] });
        qc.invalidateQueries({ queryKey: ["spin-state"] });
      }
      if (!data.spun) {
        toast(data.message || "Already spun today");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLeaderboard() {
  return useQuery<Leaderboard>({
    queryKey: ["leaderboard"],
    queryFn: () => api("/api/games/leaderboard"),
  });
}

// ─── Referral ──────────────────────────────────────────────────
export type ReferralStatus = {
  referralCode: string;
  shareUrl: string;
  shares: number;
  installs: number;
  totalPoints: number;
};

export function useReferralStatus() {
  return useQuery<ReferralStatus>({
    queryKey: ["referral-status"],
    queryFn: () => api("/api/referral/status"),
  });
}

export function useShareReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ referralCode: string; shareUrl: string; awarded: number; message: string }>("/api/referral/share", { method: "POST" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["referral-status"] });
      toast.success(data.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
