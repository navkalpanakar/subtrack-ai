"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SubRow = {
  id: string;
  name: string;
  provider: string;
  category: string;
  amount: number;
  currency: string;
  billingCycle: string;
  status: string;
  nextBillingDate: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
};

type Facets = {
  providers: Array<{ value: string; count: number }>;
  categories: Array<{ value: string; count: number }>;
  currencies: Array<{ value: string; count: number }>;
  statuses: Array<{ value: string; count: number }>;
};

type SortKey = "newest" | "oldest" | "amountDesc" | "amountAsc" | "nextBilling";

export default function AdminSubscriptionsPage() {
  const { adminFetch } = useAdminAuth();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [currency, setCurrency] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [rows, setRows] = useState<SubRow[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, provider, category, currency, status, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (provider !== "all") params.set("provider", provider);
    if (category !== "all") params.set("category", category);
    if (currency !== "all") params.set("currency", currency);
    if (status !== "all") params.set("status", status);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(limit));
    try {
      const res = await adminFetch(`/api/admin/subscriptions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load subscriptions");
      const data: {
        subscriptions: SubRow[];
        total: number;
        pages: number;
        facets: Facets;
      } = await res.json();
      setRows(data.subscriptions);
      setTotal(data.total);
      setPages(data.pages);
      setFacets(data.facets);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, debouncedQ, provider, category, currency, status, sort, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} total · page {page} of {Math.max(1, pages)}
        </p>
      </div>

      {/* Facets summary */}
      {facets && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">
                Statuses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {facets.statuses.map((s) => (
                <div key={s.value} className="flex justify-between">
                  <span className="capitalize">{s.value}</span>
                  <span className="tabular-nums text-muted-foreground">{s.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">
                Top currencies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {facets.currencies.slice(0, 5).map((c) => (
                <div key={c.value} className="flex justify-between">
                  <span>{c.value}</span>
                  <span className="tabular-nums text-muted-foreground">{c.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground">
                Top 5 providers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {facets.providers.slice(0, 5).map((p) => (
                <div key={p.value} className="flex justify-between">
                  <span>{p.value}</span>
                  <span className="tabular-nums text-muted-foreground">{p.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Name or provider…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All</SelectItem>
                {facets?.providers.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.value} ({p.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All</SelectItem>
                {facets?.categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.value} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {facets?.currencies.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {facets?.statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="capitalize">
                    {s.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sort</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-40">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="amountDesc">Amount ↓</SelectItem>
                <SelectItem value="amountAsc">Amount ↑</SelectItem>
                <SelectItem value="nextBilling">Next billing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" /> {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No subscriptions match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next billing</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.provider}</TableCell>
                      <TableCell className="text-muted-foreground">{s.category}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.currency} {s.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{s.billingCycle}</TableCell>
                      <TableCell>
                        <Badge
                          variant={s.status === "active" ? "secondary" : "outline"}
                          className="capitalize"
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.nextBillingDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{s.user.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{s.user.email}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
