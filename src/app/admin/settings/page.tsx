"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  Save,
  Bot,
  Gamepad2,
  Mail,
  Coins,
  Wrench,
  PowerOff,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Settings we manage. Booleans are toggles, currency/number are inputs.
const BOOLEAN_KEYS = [
  "ai_enabled",
  "gamification_enabled",
  "gmail_scan_enabled",
  "maintenance_mode",
] as const;

const CURRENCY_OPTIONS = [
  "USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD",
  "AED", "BRL", "CNY", "ZAR", "MXN", "NGN", "PKR", "BDT",
  "PHP", "MYR", "THB", "KRW", "VND", "IDR",
];

type Settings = Record<string, string>;

function isBoolean(key: string): key is (typeof BOOLEAN_KEYS)[number] {
  return (BOOLEAN_KEYS as readonly string[]).includes(key);
}

function SettingToggle({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
  disabled,
}: {
  icon: typeof Bot;
  title: string;
  description: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const { adminFetch, admin } = useAdminAuth();
  const canEdit = admin?.role !== "viewer";

  const [settings, setSettings] = useState<Settings | null>(null);
  const [defaults, setDefaults] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data: { settings: Settings; defaults: Settings } = await res.json();
      setSettings(data.settings);
      setDefaults(data.defaults);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key: string, value: string) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to save");
      }
      toast.success("Settings saved");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading settings…
      </div>
    );
  }
  if (error || !settings) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" /> {error || "Failed to load"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Feature flags and app-wide defaults. Changes apply immediately to all users.
          </p>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" /> Save changes
              </>
            )}
          </Button>
        )}
      </div>

      {/* Feature flags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature flags</CardTitle>
          <CardDescription>
            Toggle entire features on/off without deploying new code.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <SettingToggle
            icon={Bot}
            title="AI features"
            description="Natural-language sub parsing, insights, receipt scanning, offers"
            checked={settings.ai_enabled === "true"}
            onToggle={(v) => update("ai_enabled", v ? "true" : "false")}
            disabled={!canEdit}
          />
          <SettingToggle
            icon={Gamepad2}
            title="Gamification"
            description="Points, challenges, badges, daily spin, leaderboard"
            checked={settings.gamification_enabled === "true"}
            onToggle={(v) => update("gamification_enabled", v ? "true" : "false")}
            disabled={!canEdit}
          />
          <SettingToggle
            icon={Mail}
            title="Gmail inbox scan"
            description="Allow users to sync Gmail for subscription detection"
            checked={settings.gmail_scan_enabled === "true"}
            onToggle={(v) => update("gmail_scan_enabled", v ? "true" : "false")}
            disabled={!canEdit}
          />
          <SettingToggle
            icon={PowerOff}
            title="Maintenance mode"
            description="Block new logins; show a maintenance banner to all users"
            checked={settings.maintenance_mode === "true"}
            onToggle={(v) => update("maintenance_mode", v ? "true" : "false")}
            disabled={!canEdit}
          />
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">App defaults</CardTitle>
          <CardDescription>
            Default values used when a new user signs up (per-user overrides take precedence).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> Default currency
            </Label>
            <Select
              value={settings.default_currency}
              onValueChange={(v) => update("default_currency", v)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Default: {defaults.default_currency}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Freemium sub limit
            </Label>
            <Input
              type="number"
              min={0}
              value={settings.freemium_sub_limit}
              onChange={(e) => update("freemium_sub_limit", e.target.value)}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Free users can track at most this many subscriptions. Default: {defaults.freemium_sub_limit}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Raw view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw settings</CardTitle>
          <CardDescription>
            All key/value pairs stored in the <code>Setting</code> table (read-only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {Object.entries(settings)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  <code className="font-mono text-xs">{k}</code>
                  <div className="flex items-center gap-2">
                    {isBoolean(k) && (
                      <Badge variant={v === "true" ? "secondary" : "outline"}>
                        {v === "true" ? "on" : "off"}
                      </Badge>
                    )}
                    {!isBoolean(k) && <span className="font-mono text-xs">{v}</span>}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
