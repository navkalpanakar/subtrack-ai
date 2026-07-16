"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Gift,
  Target,
  Award,
  Save,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

// ─── Types ───────────────────────────────────────────────────────────

type Reward = {
  id: string;
  title: string;
  detail: string;
  cost: number;
  tier: string;
  icon: string;
  active: boolean;
  createdAt: string;
  redeemedCount?: number;
};

type Challenge = {
  id: string;
  title: string;
  detail: string;
  points: number;
  goal: number;
  icon: string;
  active: boolean;
  createdAt: string;
  participants?: number;
};

type BadgeItem = {
  id: string;
  key: string;
  title: string;
  detail: string;
  icon: string;
  awardedCount?: number;
};

const TIER_OPTIONS = [
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
];

const ICON_OPTIONS = [
  "gift", "trophy", "target", "award", "crown", "star",
  "medal", "flame", "zap", "sparkles", "rocket", "diamond",
];

// ─── Rewards tab ─────────────────────────────────────────────────────

function RewardsTab() {
  const { adminFetch, admin } = useAdminAuth();
  const canEdit = admin?.role !== "viewer";

  const [items, setItems] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit/create dialog state
  const [editing, setEditing] = useState<Reward | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    detail: "",
    cost: "100",
    tier: "bronze",
    icon: "gift",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/rewards");
      if (!res.ok) throw new Error("Failed to load rewards");
      const data: { rewards: Reward[] } = await res.json();
      setItems(data.rewards);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({
      title: "",
      detail: "",
      cost: "100",
      tier: "bronze",
      icon: "gift",
      active: true,
    });
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (r: Reward) => {
    setForm({
      title: r.title,
      detail: r.detail,
      cost: String(r.cost),
      tier: r.tier,
      icon: r.icon,
      active: r.active,
    });
    setEditing(r);
    setCreating(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        detail: form.detail.trim(),
        cost: Number(form.cost),
        tier: form.tier,
        icon: form.icon,
        active: form.active,
      };
      if (!payload.title || !payload.detail || Number.isNaN(payload.cost)) {
        throw new Error("Title, detail, and numeric cost are required");
      }
      const url = editing
        ? `/api/admin/rewards/${editing.id}`
        : `/api/admin/rewards`;
      const method = editing ? "PATCH" : "POST";
      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to save");
      }
      toast.success(editing ? "Reward updated" : "Reward created");
      setEditing(null);
      setCreating(false);
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
      const res = await adminFetch(`/api/admin/rewards/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Reward deleted");
      setDeleteId(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading rewards…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-40 items-center justify-center text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} reward{items.length !== 1 ? "s" : ""} ·{" "}
          {items.filter((r) => r.active).length} active
        </p>
        {canEdit && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New reward
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <Card key={r.id} className={!r.active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{r.title}</CardTitle>
                    <Badge variant="outline" className="mt-1 capitalize text-xs">
                      {r.tier}
                    </Badge>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">{r.cost} pts</div>
                  <div>{r.redeemedCount ?? 0} redeemed</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{r.detail}</p>
              {canEdit && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(r)}>
                    <Pencil className="mr-1.5 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit / create dialog */}
      <Dialog open={!!editing || creating} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit reward" : "New reward"}</DialogTitle>
            <DialogDescription>
              Rewards are scratch-card coupons users unlock with points.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. $5 Amazon coupon"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Detail</Label>
              <Textarea
                value={form.detail}
                onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
                placeholder="What the user gets, how to redeem, expiry…"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cost (points)</Label>
                <Input
                  type="number"
                  value={form.cost}
                  onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tier</Label>
                <Select value={form.tier} onValueChange={(v) => setForm((f) => ({ ...f, tier: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2 space-y-1.5">
                  <Switch
                    id="reward-active"
                    checked={form.active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  />
                  <Label htmlFor="reward-active" className="text-sm">
                    Active
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reward?</AlertDialogTitle>
            <AlertDialogDescription>
              Users who already redeemed this reward will keep their redemption record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Challenges tab ──────────────────────────────────────────────────

function ChallengesTab() {
  const { adminFetch, admin } = useAdminAuth();
  const canEdit = admin?.role !== "viewer";

  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Challenge | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    detail: "",
    points: "50",
    goal: "3",
    icon: "target",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/challenges");
      if (!res.ok) throw new Error("Failed to load challenges");
      const data: { challenges: Challenge[] } = await res.json();
      setItems(data.challenges);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ title: "", detail: "", points: "50", goal: "3", icon: "target", active: true });
    setCreating(true);
    setEditing(null);
  };
  const openEdit = (c: Challenge) => {
    setForm({
      title: c.title,
      detail: c.detail,
      points: String(c.points),
      goal: String(c.goal),
      icon: c.icon,
      active: c.active,
    });
    setEditing(c);
    setCreating(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        detail: form.detail.trim(),
        points: Number(form.points),
        goal: Number(form.goal),
        icon: form.icon,
        active: form.active,
      };
      if (!payload.title || !payload.detail || Number.isNaN(payload.points) || Number.isNaN(payload.goal)) {
        throw new Error("Title, detail, numeric points, and numeric goal are required");
      }
      const url = editing ? `/api/admin/challenges/${editing.id}` : `/api/admin/challenges`;
      const method = editing ? "PATCH" : "POST";
      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to save");
      }
      toast.success(editing ? "Challenge updated" : "Challenge created");
      setEditing(null);
      setCreating(false);
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
      const res = await adminFetch(`/api/admin/challenges/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Challenge deleted");
      setDeleteId(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-40 items-center justify-center text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} challenge{items.length !== 1 ? "s" : ""} ·{" "}
          {items.filter((c) => c.active).length} active
        </p>
        {canEdit && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New challenge
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Card key={c.id} className={!c.active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Target className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm">{c.title}</CardTitle>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">+{c.points} pts</div>
                  <div>goal: {c.goal}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{c.detail}</p>
              <div className="text-xs text-muted-foreground">
                {c.participants ?? 0} participants
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(c)}>
                    <Pencil className="mr-1.5 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing || creating} onOpenChange={(o) => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit challenge" : "New challenge"}</DialogTitle>
            <DialogDescription>
              Challenges reward users with points for completing a goal count.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Cancel 3 subscriptions"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Detail</Label>
              <Textarea
                value={form.detail}
                onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
                placeholder="Describe what the user has to do…"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Points reward</Label>
                <Input
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Goal (count)</Label>
                <Input
                  type="number"
                  value={form.goal}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <Switch
                    id="challenge-active"
                    checked={form.active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  />
                  <Label htmlFor="challenge-active" className="text-sm">
                    Active
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete challenge?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing user progress on this challenge will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Badges tab ──────────────────────────────────────────────────────

function BadgesTab() {
  const { adminFetch, admin } = useAdminAuth();
  const canEdit = admin?.role !== "viewer";

  const [items, setItems] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<BadgeItem | null>(null);
  const [form, setForm] = useState({ title: "", detail: "", icon: "award" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/badges");
      if (!res.ok) throw new Error("Failed to load badges");
      const data: { badges: BadgeItem[] } = await res.json();
      setItems(data.badges);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (b: BadgeItem) => {
    setForm({ title: b.title, detail: b.detail, icon: b.icon });
    setEditing(b);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        detail: form.detail.trim(),
        icon: form.icon.trim(),
      };
      if (!payload.title || !payload.detail || !payload.icon) {
        throw new Error("Title, detail, and icon are required");
      }
      const res = await adminFetch(`/api/admin/badges/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to save");
      }
      toast.success("Badge updated");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-40 items-center justify-center text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {items.length} badge{items.length !== 1 ? "s" : ""} · badge definitions are seeded by the app.
        Editing here updates the title, detail and icon shown to users.
      </p>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{b.title}</CardTitle>
                    <Badge variant="outline" className="mt-1 font-mono text-xs">
                      {b.key}
                    </Badge>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {b.awardedCount ?? 0} awarded
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{b.detail}</p>
              <div className="text-xs text-muted-foreground">icon: {b.icon}</div>
              {canEdit && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(b)}>
                  <Pencil className="mr-1.5 h-3 w-3" /> Edit
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit badge</DialogTitle>
            <DialogDescription>
              Badge key <code className="font-mono">{editing?.key}</code> cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Detail</Label>
              <Textarea
                value={form.detail}
                onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Edit rewards, challenges and badges — no code changes required.
        </p>
      </div>

      <Tabs defaultValue="rewards">
        <TabsList>
          <TabsTrigger value="rewards">
            <Gift className="mr-1.5 h-4 w-4" /> Rewards
          </TabsTrigger>
          <TabsTrigger value="challenges">
            <Target className="mr-1.5 h-4 w-4" /> Challenges
          </TabsTrigger>
          <TabsTrigger value="badges">
            <Award className="mr-1.5 h-4 w-4" /> Badges
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rewards" className="mt-4">
          <RewardsTab />
        </TabsContent>
        <TabsContent value="challenges" className="mt-4">
          <ChallengesTab />
        </TabsContent>
        <TabsContent value="badges" className="mt-4">
          <BadgesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
