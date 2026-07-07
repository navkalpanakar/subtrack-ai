"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Home, ListChecks, Lightbulb, Tag, Plus, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { useUI, type Tab } from "@/hooks/use-ui";
import { DashboardView } from "./views/dashboard";
import { SubscriptionsView } from "./views/subscriptions";
import { InsightsView } from "./views/insights";
import { OffersView } from "./views/offers";
import { QuickAddSheet } from "./quick-add-sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "subs", label: "Subs", icon: ListChecks },
  { id: "insights", label: "AI", icon: Lightbulb },
  { id: "offers", label: "Offers", icon: Tag },
];

export function AppShell() {
  const { tab, setTab, quickAddOpen, setQuickAddOpen } = useUI();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  return (
    <div className="relative min-h-screen flex flex-col bg-background safe-top">
      {/* Header */}
      <header className="sticky top-0 z-30 glass safe-top">
        <div className="mx-auto max-w-md px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">S</span>
            </div>
            <span className="font-semibold tracking-tight">SubPilot</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => signOut({ callbackUrl: "/" })}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 ml-1">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                {session?.user?.name?.[0]?.toUpperCase() || "G"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-md px-4 pb-28 pt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "home" && <DashboardView />}
            {tab === "subs" && <SubscriptionsView />}
            {tab === "insights" && <InsightsView />}
            {tab === "offers" && <OffersView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom navigation with center FAB */}
      <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
        <div className="mx-auto max-w-md px-4 pb-3">
          <div className="glass rounded-2xl shadow-lg shadow-black/5 px-2 h-16 flex items-center justify-between relative">
            {TABS.slice(0, 2).map((t) => (
              <NavButton key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
            ))}
            <div className="w-14" />
            {TABS.slice(2).map((t) => (
              <NavButton key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
            ))}

            {/* Center FAB */}
            <button
              onClick={() => setQuickAddOpen(true)}
              aria-label="Add subscription"
              className="absolute left-1/2 -translate-x-1/2 -top-5 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/40 flex items-center justify-center active:scale-95 transition border-4 border-background"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </nav>

      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

function NavButton({
  tab,
  active,
  onClick,
}: {
  tab: { id: Tab; label: string; icon: typeof Home };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full rounded-xl py-1.5 transition"
    >
      <Icon
        className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
        strokeWidth={active ? 2.5 : 2}
      />
      <span
        className={`text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
      >
        {tab.label}
      </span>
    </button>
  );
}
