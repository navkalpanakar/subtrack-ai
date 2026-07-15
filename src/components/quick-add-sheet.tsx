"use client";

import { useState, useRef, useEffect } from "react";
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
import {
  Sparkles, Camera, Mail, Send, Loader2, Check, MailCheck,
  Mic, MicOff, AlertCircle, ShieldCheck, RefreshCw, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateSubscription,
  parseNaturalLanguage,
  transcribeAudio,
  scanReceipt,
  scanEmail,
  scanInbox,
  checkGmailConnection,
  fetchSuggestions,
  type Subscription,
} from "@/hooks/use-subscriptions";
import { CATEGORIES, CYCLES, categoryColor } from "@/lib/format";
import { currencySymbol, POPULAR_CURRENCIES } from "@/lib/currency";
import { useCurrencyStore } from "@/hooks/use-currency-store";
import { useLinkedAccounts, useLinkAccount } from "@/hooks/use-gamification";

type Draft = {
  name: string;
  provider: string;
  category: string;
  amount: string;
  currency: string;
  billingCycle: string;
  nextBillingDate: string;
  logo: string | null;
  color: string | null;
  cancelUrl: string | null;
  usageTags: string;
};

const emptyDraft = (currency: string): Draft => ({
  name: "",
  provider: "",
  category: "Other",
  amount: "",
  currency,
  billingCycle: "monthly",
  nextBillingDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  logo: null,
  color: null,
  cancelUrl: null,
  usageTags: "",
});

type Verification = {
  needsVerification: boolean;
  userAmount: number | null;
  expectedAmount: number | null;
  reason: string;
};

export function QuickAddSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<"ai" | "scan" | "email">("ai");
  const create = useCreateSubscription();
  const { data: linkedAccounts } = useLinkedAccounts();
  const linkAccount = useLinkAccount();
  const { currency, setCurrency: setGlobalCurrency } = useCurrencyStore();

  // Gmail connection state — true only if the user has an active Google
  // OAuth session with a valid access token. Email/OTP users get false.
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  useEffect(() => {
    if (!open || mode !== "email") return;
    let cancelled = false;
    checkGmailConnection()
      .then((res) => { if (!cancelled) setGmailConnected(res.connected); })
      .catch(() => { if (!cancelled) setGmailConnected(false); });
    return () => { cancelled = true; };
  }, [open, mode]);

  // AI natural language state
  const [nlText, setNlText] = useState("");
  const [parsing, setParsing] = useState(false);

  // "Did you mean?" suggestions (debounced as user types/speaks)
  const [suggestions, setSuggestions] = useState<Array<{ correctedText: string; provider: string; reason: string }>>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTextWithSuggest = (text: string) => {
    setNlText(text);
    // Debounce the suggestion fetch (500ms after user stops typing)
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await fetchSuggestions(text);
        setSuggestions(res.hasTypo ? res.suggestions : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 500);
  };

  // Voice input state
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Draft form (shared by all modes after parsing)
  const [draft, setDraft] = useState<Draft | null>(null);

  // Price verification prompt (shown when AI detects a mismatch)
  const [verification, setVerification] = useState<Verification | null>(null);

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
    setVerification(null);
    setMode("ai");
  };

  // ─── Voice input (ASR) ─────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) {
          toast.error("No audio captured.");
          return;
        }
        // Convert to base64
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          setTranscribing(true);
          try {
            const { text } = await transcribeAudio(dataUrl);
            if (text) {
              updateTextWithSuggest(text);
              toast.success("Heard you! Tap Parse to add.");
            } else {
              toast.error("Couldn't catch that — try again.");
            }
          } catch {
            toast.error("Transcription failed. Try typing instead.");
          } finally {
            setTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      toast.info("Listening… tap stop when done.");
    } catch {
      toast.error("Microphone access denied. Check browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // ─── AI parse + price verification ─────────────────────────────
  const handleParse = async () => {
    if (!nlText.trim()) return;
    setParsing(true);
    try {
      const parsed = await parseNaturalLanguage(nlText, currency);
      const newDraft: Draft = {
        name: parsed.name || "",
        provider: parsed.provider || parsed.name || "",
        category: parsed.category || "Other",
        amount: parsed.amount ? String(parsed.amount) : "",
        currency: parsed.currency || currency,
        billingCycle: parsed.billingCycle || "monthly",
        nextBillingDate:
          parsed.nextBillingDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        logo: null,
        color: categoryColor(parsed.category || "Other"),
        cancelUrl: null,
        usageTags: "",
      };

      // Price verification: if the AI flagged a mismatch, show the verify
      // dialog BEFORE opening the draft form. User must confirm the price.
      if (parsed.verification?.needsVerification) {
        setVerification(parsed.verification);
        setDraft(newDraft);
      } else {
        setDraft(newDraft);
        toast.success("Parsed! Review and save.");
      }
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
          currency: String(first.currency || currency),
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
          currency: String(s.currency || currency),
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

  const handleInboxSync = async (provider: "gmail") => {
    setEmailParsing(true);
    try {
      const result = await scanInbox(provider);
      const providerKey = "google";
      const labels = { gmail: "Gmail" };

      // Not connected — show a clear, actionable message
      if (result.connected === false) {
        const msg = result.error || result.message || `${labels[provider]} sync isn't available.`;
        toast.error(`${labels[provider]} not available`, {
          description: msg,
          duration: 8000,
        });
        return;
      }

      // Scan succeeded — link the account
      await linkAccount.mutateAsync({
        provider: providerKey,
        identifier: `${provider} linked`,
      });

      const detected = result.detected || [];
      if (detected.length === 0) {
        toast(`No subscriptions found in ${labels[provider]}.`, {
          description:
            "Try the 'Paste email' option below — just paste any billing email you've received and we'll extract the subscription details.",
          duration: 6000,
        });
        return;
      }
      setBulkDrafts(
        detected.map((s) => ({
          name: String(s.name || ""),
          provider: String(s.provider || s.name || ""),
          category: String(s.category || "Other"),
          amount: s.amount ? String(s.amount) : "",
          currency: String(s.currency || currency),
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
      toast.success(`Synced ${detected.length} subscription(s) from ${labels[provider]} — account linked!`);
    } catch {
      toast.error("Inbox sync failed. Try the 'Paste email' option instead.");
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
      currency: d.currency,
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

  // Confirm the user's stated price (after verification flag)
  const confirmUserPrice = () => {
    setVerification(null);
    toast.success("Got it — using your stated price.");
  };
  const useExpectedPrice = () => {
    if (draft && verification?.expectedAmount) {
      setDraft({ ...draft, amount: String(verification.expectedAmount) });
    }
    setVerification(null);
    toast.success(`Updated to the web-verified price.`);
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
            Type, speak, scan, or sync your inbox — Savvy does the rest.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          {/* Currency selector (always visible) */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            <span className="text-muted-foreground">Currency:</span>
            <Select
              value={currency}
              onValueChange={(v) => {
                setGlobalCurrency(v);
              }}
            >
              <SelectTrigger className="h-7 w-auto text-xs gap-1 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {currencySymbol(c)} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground ml-auto">
              Detected from your locale · change anytime
            </span>
          </div>

          {/* Price verification dialog (shown before draft form) */}
          {verification && draft ? (
            <VerifyPriceDialog
              verification={verification}
              draftName={draft.name}
              currency={draft.currency}
              onConfirmUser={confirmUserPrice}
              onUseExpected={useExpectedPrice}
            />
          ) : draft ? (
            <DraftForm
              draft={draft}
              onChange={setDraft}
              onSave={handleSave}
              saving={create.isPending}
              onCancel={() => { setDraft(null); setVerification(null); }}
              onReparse={() => {
                // Go back to the AI tab with the original text so the user
                // can correct it and re-run the AI parse.
                setDraft(null);
                setVerification(null);
                setMode("ai");
                toast.info("Correct the text below and tap Parse again");
              }}
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

              {/* AI natural language + voice */}
              <TabsContent value="ai" className="mt-4 space-y-3">
                <div className="rounded-xl bg-accent/40 p-3 text-xs text-muted-foreground">
                  Try:{" "}
                  <span className="text-foreground font-medium">
                    “Netflix {currencySymbol(currency)}199 monthly renews the 5th”
                  </span>
                </div>
                <div className="relative">
                  <Textarea
                    value={nlText}
                    onChange={(e) => updateTextWithSuggest(e.target.value)}
                    placeholder="Describe your subscription in any words… or tap the mic to speak"
                    rows={3}
                    className="resize-none pr-12"
                  />
                  {/* Mic button */}
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={transcribing}
                    className={`absolute right-2 bottom-2 h-9 w-9 rounded-full flex items-center justify-center transition ${
                      recording
                        ? "bg-destructive text-white animate-pulse"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                    aria-label={recording ? "Stop recording" : "Start voice input"}
                  >
                    {transcribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : recording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {recording && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    Recording… tap the mic to stop & transcribe
                  </p>
                )}

                {/* "Did you mean?" suggestion chips — appear when Savvy detects a typo */}
                {(suggestLoading || suggestions.length > 0) && (
                  <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      <Lightbulb className="h-3.5 w-3.5" />
                      {suggestLoading ? "Savvy is checking…" : "Did you mean?"}
                    </div>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setNlText(s.correctedText);
                          setSuggestions([]);
                          toast.success(`Using “${s.provider}”`);
                        }}
                        className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg bg-background hover:bg-amber-500/10 transition active:scale-[0.98]"
                      >
                        <div className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{s.provider}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {s.reason} · “{s.correctedText}”
                          </p>
                        </div>
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

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
                  Parse & verify with Savvy
                </Button>
                <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Savvy cross-checks the price online before saving
                </p>
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

              {/* Email sync — Gmail one-tap + paste */}
              <TabsContent value="email" className="mt-4 space-y-3">
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 flex items-start gap-2">
                  <MailCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-foreground">One-tap inbox sync</p>
                    <p className="text-muted-foreground mt-0.5">
                      Connect your email to auto-detect every subscription from billing emails.
                    </p>
                  </div>
                </div>

                {/* Gmail connection warning for email/OTP users */}
                {gmailConnected === false && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        Gmail sync needs Google sign-in
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        You signed in with email. To scan your Gmail inbox, log out and use
                        <span className="font-medium"> Continue with Google</span>. Or use
                        <span className="font-medium"> Paste email</span> below to add subscriptions manually.
                      </p>
                    </div>
                  </div>
                )}

                {/* Provider one-tap buttons — Gmail only (Outlook/Apple removed) */}
                <div className="grid grid-cols-1 gap-2">
                  <InboxButton
                    label="Gmail"
                    color="#EA4335"
                    connected={gmailConnected === true}
                    onClick={() => handleInboxSync("gmail")}
                    disabled={emailParsing || gmailConnected === false}
                  />
                </div>
                {emailParsing && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Scanning inbox…
                  </p>
                )}

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

// ─── Inbox provider button ──────────────────────────────────────
function InboxButton({
  label, color, onClick, disabled, connected,
}: {
  label: string; color: string; onClick: () => void; disabled: boolean; connected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition disabled:opacity-50 relative ${
        connected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:bg-accent/50 active:scale-[0.97]"
      }`}
    >
      {connected && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
      )}
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: color }}
      >
        {label[0]}
      </div>
      <span className="text-[11px] font-medium">{label}</span>
      {connected && (
        <span className="text-[9px] text-primary font-semibold">Linked</span>
      )}
    </button>
  );
}

// ─── Price verification dialog ──────────────────────────────────
function VerifyPriceDialog({
  verification, draftName, currency, onConfirmUser, onUseExpected,
}: {
  verification: Verification;
  draftName: string;
  currency: string;
  onConfirmUser: () => void;
  onUseExpected: () => void;
}) {
  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
        <AlertCircle className="h-4 w-4" /> Price check
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <p className="text-sm leading-relaxed">
          You said <span className="font-bold">{draftName}</span> costs{" "}
          <span className="font-bold text-amber-600">
            {currencySymbol(currency)}{verification.userAmount}
          </span>
          , but Savvy couldn't find that price online.
        </p>
        {verification.reason && (
          <p className="text-xs text-muted-foreground italic">
            “{verification.reason}”
          </p>
        )}
        {verification.expectedAmount && (
          <p className="text-sm">
            The closest match Savvy found is{" "}
            <span className="font-bold text-primary">
              {currencySymbol(currency)}{verification.expectedAmount}
            </span>
            .
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Are you sure you paid {currencySymbol(currency)}{verification.userAmount}?
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={onConfirmUser} variant="outline" className="w-full">
          <Check className="h-4 w-4 mr-2" />
          Yes, {currencySymbol(currency)}{verification.userAmount} is correct
        </Button>
        <Button onClick={onUseExpected} className="w-full">
          Use {currencySymbol(currency)}{verification.expectedAmount} instead
        </Button>
        <button
          onClick={() => window.history.go(0)}
          className="text-xs text-muted-foreground hover:text-foreground py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Draft review form ──────────────────────────────────────────
function DraftForm({
  draft, onChange, onSave, onCancel, saving, onReparse, reparsing,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  onReparse?: () => void;
  reparsing?: boolean;
}) {
  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Check className="h-4 w-4" /> Review &amp; save
        </div>
        {onReparse && (
          <button
            onClick={onReparse}
            disabled={reparsing}
            className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition"
          >
            {reparsing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Re-parse
          </button>
        )}
      </div>
      {/* AI got it wrong? hint */}
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 px-3 py-2 text-[11px] text-muted-foreground">
        💡 <span className="text-foreground font-medium">Savvy got something wrong?</span> Edit any field below,
        or tap <span className="text-primary font-medium">Re-parse</span> to try again with corrected text.
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
          <Label className="text-xs">Amount ({draft.currency})</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => onChange({ ...draft, amount: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Currency</Label>
          <Select
            value={draft.currency}
            onValueChange={(v) => onChange({ ...draft, currency: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POPULAR_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{currencySymbol(c)} {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

// ─── Bulk review ────────────────────────────────────────────────
function BulkReview({
  drafts, onSaveAll, onRemove, saving,
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
                {d.category} · {currencySymbol(d.currency)}{d.amount || "?"}/{d.billingCycle}
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
