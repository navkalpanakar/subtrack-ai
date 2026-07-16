"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  ArrowUpDown,
  Eye,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string | null;
  plan: string;
  createdAt: string;
  updatedAt: string;
  progress: { points: number; level: number; streak: number } | null;
  subscriptions: Array<{ amount: number; currency: string; billingCycle: string }>;
  monthlySpendUsd: number;
  activeSubs: number;
};

type UserDetail = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  currency: string | null;
  plan: string;
  occupation: string | null;
  organization: string | null;
  createdAt: string;
  updatedAt: string;
  referralCode: string | null;
  referredBy: string | null;
  progress: {
    points: number;
    level: number;
    streak: number;
    savingsGoal: number;
    totalSaved: number;
  } | null;
  subscriptions: Array<{
    id: string;
    name: string;
    provider: string;
    category: string;
    amount: number;
    currency: string;
    billingCycle: string;
    status: string;
    nextBillingDate: string;
  }>;
  badges: Array<{ id: string; earnedAt: string; badge: { key: string; title: string; icon: string } }>;
  linkedAccounts: Array<{ id: string; provider: string; identifier: string }>;
  rewards: Array<{
    id: string;
    redeemedAt: string;
    revealed: boolean;
    reward: { title: string; cost: number };
  }>;
  spinResults: Array<{ id: string; points: number; date: string; createdAt: string }>;
  referrals: Array<{ id: string; code: string; status: string; createdAt: string }>;
};

type SortKey = "newest" | "oldest" | "points" | "spend";

export default function AdminUsersPage() {
  const { adminFetch, admin } = useAdminAuth();
  const canEdit = admin?.role !== "viewer";

  const [q, setQ] = useState("");
  const [plan, setPlan] = useState<"all" | "free" | "premium">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  // Selected user for detail sheet
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState<{ name: string; plan: string; currency: string; country: string; points: string }>({
    name: "",
    plan: "free",
    currency: "USD",
    country: "",
    points: "",
  });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, plan, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (plan !== "all") params.set("plan", plan);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(limit));
    try {
      const res = await adminFetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data: { users: UserRow[]; total: number; pages: number } = await res.json();
      setRows(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, debouncedQ, plan, sort, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await adminFetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error("Failed to load user");
      const data: { user: UserDetail } = await res.json();
      setDetail(data.user);
      setEditForm({
        name: data.user.name ?? "",
        plan: data.user.plan,
        currency: data.user.currency ?? "USD",
        country: data.user.country ?? "",
        points: data.user.progress?.points?.toString() ?? "0",
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/users/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          plan: editForm.plan,
          currency: editForm.currency,
          country: editForm.country,
          pointsSet: Number(editForm.points),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      toast.success("User updated");
      // Refresh detail + table
      await openDetail(detail.id);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/users/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("User deleted");
      setDeleteId(null);
      setDetail(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} total users · page {page} of {Math.max(1, pages)}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Name, email, phone, referral code…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sort</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-36">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="points">Most points</SelectItem>
                <SelectItem value="spend">Highest spend</SelectItem>
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
              No users match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Active subs</TableHead>
                    <TableHead className="text-right">Spend/mo (USD)</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-sm">{u.country || "—"}</TableCell>
                      <TableCell>
                        {u.plan === "premium" ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            <Crown className="mr-1 h-3 w-3" /> Premium
                          </Badge>
                        ) : (
                          <Badge variant="outline">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{u.activeSubs}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${u.monthlySpendUsd.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.progress?.points ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(u.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
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

      {/* Detail sheet */}
      <Sheet open={!!detail || detailLoading} onOpenChange={(o) => { if (!o) { setDetail(null); setDetailLoading(false); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{detail?.name || detail?.email || "Loading…"}</SheetTitle>
            <SheetDescription>
              {detail?.email} · joined {detail && new Date(detail.createdAt).toLocaleString()}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading user…
            </div>
          ) : detail ? (
            <div className="space-y-6 px-4 pb-12">
              {/* Edit form */}
              {canEdit && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Edit user</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Plan</Label>
                      <Select
                        value={editForm.plan}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, plan: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Currency</Label>
                      <Input
                        value={editForm.currency}
                        onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
                        placeholder="USD"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Input
                        value={editForm.country}
                        onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Points (set absolute value)</Label>
                      <Input
                        type="number"
                        value={editForm.points}
                        onChange={(e) => setEditForm((f) => ({ ...f, points: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-between">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(detail.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete user
                      </Button>
                      <Button size="sm" onClick={saveEdit} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
                          </>
                        ) : (
                          "Save changes"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">Points</div>
                    <div className="text-xl font-bold">{detail.progress?.points ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">Level</div>
                    <div className="text-xl font-bold">{detail.progress?.level ?? 1}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">Streak</div>
                    <div className="text-xl font-bold">{detail.progress?.streak ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">Total saved</div>
                    <div className="text-xl font-bold">${detail.progress?.totalSaved ?? 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Subscriptions */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Subscriptions ({detail.subscriptions.length})
                </h3>
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {detail.subscriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No subscriptions.</p>
                  ) : (
                    detail.subscriptions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-md border border-border bg-card p-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.provider} · {s.billingCycle} · {s.category}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="tabular-nums">
                            {s.currency} {s.amount.toFixed(2)}
                          </div>
                          <Badge
                            variant={s.status === "active" ? "secondary" : "outline"}
                            className="mt-1 text-xs"
                          >
                            {s.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Badges */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Badges ({detail.badges.length})
                </h3>
                {detail.badges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No badges earned.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detail.badges.map((b) => (
                      <Badge key={b.id} variant="secondary">
                        {b.badge.icon} {b.badge.title}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked accounts */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Linked accounts ({detail.linkedAccounts.length})
                </h3>
                {detail.linkedAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked accounts.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.linkedAccounts.map((la) => (
                      <div
                        key={la.id}
                        className="flex items-center justify-between rounded-md border border-border bg-card p-2 text-sm"
                      >
                        <span className="font-medium capitalize">{la.provider}</span>
                        <span className="text-muted-foreground">{la.identifier}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/"
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Open user app in new tab →
              </Link>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the user and all their subscriptions, progress, badges, and history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
