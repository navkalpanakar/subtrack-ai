"use client";

import { create } from "zustand";

export type Tab = "home" | "subs" | "insights" | "rewards";

interface UIState {
  tab: Tab;
  setTab: (t: Tab) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (v: boolean) => void;
  editTarget: { id: string } | null;
  setEditTarget: (v: { id: string } | null) => void;
}

export const useUI = create<UIState>((set) => ({
  tab: "home",
  setTab: (tab) => set({ tab }),
  quickAddOpen: false,
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
  editTarget: null,
  setEditTarget: (editTarget) => set({ editTarget }),
}));
