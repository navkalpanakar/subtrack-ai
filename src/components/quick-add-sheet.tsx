"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Camera, Mail, Send, Loader2, Check, MailCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateSubscription,
  parseNaturalLanguage,
  scanReceipt,
  scanEmail,
  scanGmail,
  type Subscription,
} from "@/hooks/use-subscriptions";
import { CATEGORIES, CYCLES, categoryColor } from "@/lib/format";

type Draft = {
  name: string;
  provider: string;
  category: string;
  amount: string;
  billingCycle: string;
  nextBillingDate: string;
  logo: string | null;
  color: string | null;
  cancelUrl: string | null;
  usageTags: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  provider: "",
  category: "Other",
  amount: "",
  billingCycle: "monthly",
  nextBillingDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  logo: null,
  color: null,
  cancelUrl: null,
  usageTags: "",
});

export function QuickAddSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"ai" | "scan" | "email">("ai");
  const create = useCreateSubscription();

  // AI natural language state
  const [nlText, setNlText] = useState("");
  const [parsing, setParsing] = useState(false);

  // Draft form (shared by all modes after parsing)
  const [draft, setDraft] = useState<Draft | null>(null);

  // Receipt state
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Email state
  const [emailText, setEmailText] = useState("");
  const [emailParsing, setEmailParsing] = useState(false);
  const [bulkDrafts, setBulkDrafts] = useState<Draft[] | null>(null);

  const reset = () => {
    setNlText("");
    setDraft(null);
    setReceiptPreview(null);
    setEmailText("");
    setBulkDrafts(null);
    setMode("ai");
  };

  const handleParse = async () => {
    if (!nlText.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseNaturalLanguage(nlText);
      setDraft({
        name: parsed.name || "",
        provider: parsed.provider || parsed.name || "",
        category: parsed.category || "Other",
        amount: parsed.amount ? String(parsed.amount) : "",
        billingCycle: parsed.billingCycle || "monthly",
        nextBillingDate:
          parsed.nextBillingDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        logo: null,
        color: categoryColor(parsed.category || "Other"),
        cancelUrl: null,
        usageTags: "",
      });
      toast.success("Parsed! Review and save.");
    } catch {
      toast.error("Could not parse that. Try rephrasing.");
    } finally {
      setParsing(false);
    }
  };

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setReceiptPreview(dataUrl);
      setScanning(true);
      try {
        const { subscriptions } = await scanReceipt(dataUrl);
        if (subscriptions.length === 0) {
          toast.error("No subscriptions detected in the image.");
          return;
        }
        const first = subscriptions[0];
        setDraft({
          name: String(first.name || ""),
          provider: String(first.provider || first.name || ""),
          category: String(first.category || "Other"),
          amount: first.amount ? String(first.amount) : "",
          billingCycle: String(first.billingCycle || "monthly"),
          nextBillingDate:
            (first.nextBillingDate as string) ||
            new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          logo: null,
          color: categoryColor(String(first.category || "Other")),
          cancelUrl: null,
          usageTags: "",
        });
        toast.success(`Found ${subscriptions.length} subscription(s). Review the first.`);
      } catch {
        toast.error("Scan failed. Try a clearer photo.");
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEmailParse = async () => {
    if (!emailText.trim()) return;
    setEmailParsing(true);
    try {
      const { subscriptions } = await scanEmail(emailText);
      if (subscriptions.length === 0) {
        toast.error("No subscriptions found in that text.");
        return;
      }
      setBulkDrafts(
        subscriptions.map((s) => ({
          name: String(s.name || ""),
          provider: String(s.provider || s.name || ""),
          category: String(s.category || "Other"),
          amount: s.amount ? String(s.amount) : "",
          billingCycle: String(s.billingCycle || "monthly"),
          nextBillingDate:
            (s.nextBillingDate as string) ||
            new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          logo: null,
          color: categoryColor(String(s.category || "Other")),
          cancelUrl: null,
          usageTags: "",
        }))
      );
      toast.success(`Found ${subscriptions.length} subscription(s).`);
    } catch {
      toast.error("Could not scan that text.");
    } finally {
      setEmailParsing(false);
    }
  };

  const handleGmailSync = async () => {
    setEmailParsing(true);
    try {
      const { detected } = await scanGmail();
      if (detected.length === 0) {
        toast.error("No subscriptions detected.");
        return;
      }
      setBulkDrafts(
        detected.map((s) => ({
          name: String(s.name || ""),
          provider: String(s.provider || s.name || ""),
          category: String(s.category || "Other"),
          amount: s.amount ? String(s.amount) : "",
          billingCycle: String(s.billingCycle || "monthly"),
          nextBillingDate:
            (s.nextBillingDate as string) ||
            new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          logo: (s.logo as string) || null,
          color: (s.color as string) || categoryColor(String(s.category || "Other")),
          cancelUrl: (s.cancelUrl as string) || null,
          usageTags: "",
        }))
      );
      toast.success(`Synced ${detected.length} subscription(s) from inbox preview.`);
    } catch {
      toast.error("Gmail sync failed.");
    } finally {
      setEmailParsing(false);
    }
  };

  const saveDraft = async (d: Draft) => {
    await create.mutateAsync({
      name: d.name,
      provider: d.provider,
      category: d.category,
      amount: Number(d.amount) || 0,
      currency: "USD",
      billingCycle: d.billingCycle,
      nextBillingDate: d.nextBillingDate,
      logo: d.logo,
      color: d.color,
      cancelUrl: d.cancelUrl,
      usageTags: d.usageTags,
      status: "active",
    } as Partial<Subscription>);
    toast.success(`${d.name} added`);
  };

  const handleSave = async () => {
    if (!draft) return;
    await saveDraft(draft);
    reset();
    onOpenChange(false);
  };

  const handleSaveAllBulk = async () => {
    if (!bulkDrafts) return;
    for (const d of bulkDrafts) {
      await saveDraft(d);
    }
    toast.success(`Added ${bulkDrafts.length} subscriptions`);
    reset();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTimeout(reset, 300); }}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Add subscription
          </DrawerTitle>
          <DrawerDescription>
            Type it, scan a receipt, or sync your email — AI does the rest.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          {/* If a single draft is ready, show the review form */}
          {draft ? (
            <DraftForm
              draft={draft}
              onChange={setDraft}
              onSave={handleSave}
              saving={create.isPending}
              onCancel={() => setDraft(null)}
            />
          ) : bulkDrafts ? (
            <BulkReview
              drafts={bulkDrafts}
              onSaveAll={handleSaveAllBulk}
              saving={create.isPending}
              onRemove={(i) =>
                setBulkDrafts(bulkDrafts.filter((_, idx) => idx !== i))
              }
            />
          ) : (
            <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="ai" className="text-xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> AI
                </TabsTrigger>
                <TabsTrigger value="scan" className="text-xs">
                  <Camera className="h-3.5 w-3.5 mr-1" /> Scan
                </TabsTrigger>
                <TabsTrigger value="email" className="text-xs">
                  <Mail className="h-3.5 w-3.5 mr-1" /> Email
                </TabsTrigger>
              </TabsList>

              {/* AI natural language */}
              <TabsContent value="ai" className="mt-4 space-y-3">
                <div className="rounded-xl bg-accent/40 p-3 text-xs text-muted-foreground">
                  Try:{" "}
                  <span className="text-foreground font-medium">
                    “Netflix $15.49 monthly renews the 5th”
                  </span>
                </div>
                <Textarea
                  value={nlText}
                  onChange={(e) => setNlText(e.target.value)}
                  placeholder="Describe your subscription in any words…"
                  rows={3}
                  className="resize-none"
                />
                <Button
                  onClick={handleParse}
                  disabled={!nlText.trim() || parsing}
                  className="w-full"
                >
                  {parsing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Parse with AI
                </Button>
              </TabsContent>

              {/* Receipt scan */}
              <TabsContent value="scan" className="mt-4 space-y-3">
                {receiptPreview ? (
                  <div className="relative rounded-xl overflow-hidden border">
                    <img src={receiptPreview} alt="Receipt" className="w-full max-h-48 object-cover" />
                    {scanning && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Scanning…
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Snap or upload a receipt</span>
                    <span className="text-xs text-muted-foreground">AI reads merchant, amount & cycle</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </label>
                )}
                {receiptPreview && !scanning && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setReceiptPreview(null)}
                  >
                    Choose a different image
                  </Button>
                )}
              </TabsContent>

              {/* Email sync */}
              <TabsContent value="email" className="mt-4 space-y-3">
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 flex items-start gap-2">
                  <MailCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-foreground">One-click inbox sync</p>
                    <p className="text-muted-foreground mt-0.5">
                      Connect Gmail to auto-detect every subscription from billing
                      emails. (Live OAuth ready — preview mode shown.)
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleGmailSync}
                  disabled={emailParsing}
                  variant="outline"
                  className="w-full"
                >
                  {emailParsing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MailCheck className="h-4 w-4 mr-2" />
                  )}
                  Scan my inbox (preview)
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-px bg-border flex-1" />
                  or paste an email
                  <div className="h-px bg-border flex-1" />
                </div>

                <Textarea
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  placeholder="Paste a billing confirmation email here…"
                  rows={4}
                  className="resize-none"
                />
                <Button
                  onClick={handleEmailParse}
                  disabled={!emailText.trim() || emailParsing}
                  variant="secondary"
                  className="w-full"
                >
                  {emailParsing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Extract subscriptions
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function DraftForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Check className="h-4 w-4" /> Review &amp; save
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Provider</Label>
          <Input
            value={draft.provider}
            onChange={(e) => onChange({ ...draft, provider: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select
            value={draft.category}
            onValueChange={(v) => onChange({ ...draft, category: v, color: categoryColor(v) })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Amount ($)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => onChange({ ...draft, amount: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Billing cycle</Label>
          <Select
            value={draft.billingCycle}
            onValueChange={(v) => onChange({ ...draft, billingCycle: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CYCLES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Next billing date</Label>
          <Input
            type="date"
            value={draft.nextBillingDate}
            onChange={(e) => onChange({ ...draft, nextBillingDate: e.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Cancel URL (optional)</Label>
          <Input
            placeholder="https://…"
            value={draft.cancelUrl || ""}
            onChange={(e) => onChange({ ...draft, cancelUrl: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Back
        </Button>
        <Button onClick={onSave} disabled={saving || !draft.name} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function BulkReview({
  drafts,
  onSaveAll,
  onRemove,
  saving,
}: {
  drafts: Draft[];
  onSaveAll: () => void;
  onRemove: (i: number) => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <MailCheck className="h-4 w-4" /> {drafts.length} found — review
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {drafts.map((d, i) => (
          <div key={i} className="glass rounded-xl p-3 flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: (d.color || "#64748b") + "25", color: d.color || "#64748b" }}
            >
              {d.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {d.category} · ${d.amount || "?"}/{d.billingCycle}
              </p>
            </div>
            <button
              onClick={() => onRemove(i)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <Button onClick={onSaveAll} disabled={saving || drafts.length === 0} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
        Add all {drafts.length} subscriptions
      </Button>
    </div>
  );
}
