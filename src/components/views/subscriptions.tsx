"use client";

import { useMemo, useState } from "react";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { useSubscriptions, useDeleteSubscription, type Subscription } from "@/hooks/use-subscriptions";
import { useUI } from "@/hooks/use-ui";
import { SubscriptionCard } from "@/components/subscription-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, monthlyEquivalent } from "@/lib/format";
import { useFormatCurrency } from "@/hooks/use-currency-store";

type SortKey = "renewal" | "amount" | "name";
type Filter = "all" | "active" | "cancelled";

export function SubscriptionsView() {
  const { data: subs, isLoading } = useSubscriptions();
  const deleteSub = useDeleteSubscription();
  const { setQuickAddOpen, setEditTarget, setEditOpen } = useUI();
  const fmt = useFormatCurrency();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("renewal");
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!subs) return [];
    let list = subs.filter((s) => {
      if (filter === "active" && s.status !== "active") return false;
      if (filter === "cancelled" && s.status === "active") return false;
      if (category !== "all" && s.category !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.provider.toLowerCase().includes(q) &&
          !s.category.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "renewal")
        return new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime();
      if (sort === "amount") return Number(b.amount) - Number(a.amount);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [subs, query, sort, filter, category]);

  const totalMonthly = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "active")
        .reduce((sum, s) => sum + monthlyEquivalent(Number(s.amount), s.billingCycle), 0),
    [filtered]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-bold text-xl tracking-tight">Subscriptions</h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} shown · {fmt(totalMonthly)}/mo
          </p>
        </div>
        <Button size="sm" onClick={() => setQuickAddOpen(true)} className="rounded-full">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subscriptions…"
          className="pl-9 bg-card"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="h-8 w-auto gap-1 text-xs rounded-full">
            <SlidersHorizontal className="h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 w-auto text-xs rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-8 w-auto text-xs rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="renewal">By renewal</SelectItem>
            <SelectItem value="amount">By amount</SelectItem>
            <SelectItem value="name">By name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No subscriptions match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s: Subscription) => (
            <SubscriptionCard
              key={s.id}
              sub={s}
              onDelete={(id) => deleteSub.mutate(id)}
              onEdit={(id) => { setEditTarget({ id }); setEditOpen(true); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
