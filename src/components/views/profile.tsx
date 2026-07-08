"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User, Mail, Phone, LogOut, Check, Loader2, Link2, Share2, Copy, Gift,
  Trash2, AlertTriangle, Globe, Sparkles, Crown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLinkedAccounts, useReferralStatus, useShareReferral } from "@/hooks/use-gamification";
import { useCurrencyStore, COUNTRIES, countryByCode, countryByCurrency } from "@/hooks/use-currency-store";
import { SavvyMascot } from "@/components/savvy-mascot";
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
import { toast } from "sonner";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  referralCode: string | null;
  createdAt: string;
  dateOfBirth: string | null;
  occupation: string | null;
  organization: string | null;
  linkedAccounts: Array<{ provider: string; identifier: string }>;
};

export function ProfileView() {
  const { user, signOut } = useAuth();
  const { data: linked } = useLinkedAccounts();
  const { data: referral } = useReferralStatus();
  const shareReferral = useShareReferral();
  const { currency, countryCode, setCurrency: setGlobalCurrency } = useCurrencyStore();
  const [selectedCountry, setSelectedCountry] = useState(countryCode || "");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // DOB + occupation + organization for curated insights
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [occupation, setOccupation] = useState<string>("");
  const [organization, setOrganization] = useState("");

  // Email change flow
  const [emailMode, setEmailMode] = useState<null | "enter" | "otp">(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [devEmailOtp, setDevEmailOtp] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  // Delete account flow (requires email OTP)
  const [deleteMode, setDeleteMode] = useState<null | "confirm" | "otp">(null);
  const [deleteOtp, setDeleteOtp] = useState("");
  const [devDeleteOtp, setDevDeleteOtp] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  useEffect(() => {
    fetch("/api/account/profile", { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setDateOfBirth(data.dateOfBirth || "");
        setOccupation(data.occupation || "");
        setOrganization(data.organization || "");
      })
      .catch(() => {});
  }, [linked]);

  const saveName = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const updated = await res.json();
      setProfile(updated);
      setEditingName(false);
      toast.success("Name updated");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const savePhone = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const updated = await res.json();
      setProfile(updated);
      setEditingPhone(false);
      toast.success("Phone updated");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const saveProfileDetails = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth, occupation, organization }),
      });
      const updated = await res.json();
      setProfile({ ...profile, ...updated });
      toast.success("Profile details saved — Savvy will use these for curated insights");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const sendEmailChangeOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error("Enter a valid email");
      return;
    }
    setEmailSaving(true);
    try {
      const res = await fetch("/api/account/change-email-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setDevEmailOtp(data.devOtp || null);
        setEmailMode("otp");
        toast.success(data.devOtp ? `Preview code: ${data.devOtp}` : "Code sent to your new email!");
      }
    } catch {
      toast.error("Could not send code");
    } finally {
      setEmailSaving(false);
    }
  };

  const verifyEmailChange = async () => {
    setEmailSaving(true);
    try {
      const res = await fetch("/api/account/change-email-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, otp: emailOtp }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setProfile(data);
        setEmailMode(null);
        setNewEmail("");
        setEmailOtp("");
        setDevEmailOtp(null);
        toast.success("Email updated!");
      }
    } catch {
      toast.error("Could not verify");
    } finally {
      setEmailSaving(false);
    }
  };

  const sendDeleteOtp = async () => {
    setDeleteSaving(true);
    try {
      const res = await fetch("/api/account/delete-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setDevDeleteOtp(data.devOtp || null);
        setDeleteMode("otp");
        toast.success(data.devOtp ? `Preview code: ${data.devOtp}` : `Deletion code sent to ${data.email}`);
      }
    } catch {
      toast.error("Could not send code");
    } finally {
      setDeleteSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteSaving(true);
    try {
      const res = await fetch("/api/account/delete-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: deleteOtp }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setDeleteSaving(false);
      } else {
        toast.success("Account deleted");
        // sign out locally
        localStorage.removeItem("subpilot_token");
        window.location.href = "/";
      }
    } catch {
      toast.error("Could not delete account");
      setDeleteSaving(false);
    }
  };

  const handleShare = async () => {
    await shareReferral.mutateAsync();
  };

  const handleCountryChange = async (code: string) => {
    setSelectedCountry(code);
    const country = countryByCode(code);
    if (country) {
      // Update the global currency store (reactive across the whole app)
      setGlobalCurrency(country.currency, code);
      // Persist to the user's account
      try {
        await fetch("/api/account/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: country.name,
            countryCode: code,
            city: "",
            currency: country.currency,
          }),
        });
      } catch {
        // non-critical
      }
      toast.success(`${country.flag} ${country.name} · ${country.currency}`);
    }
  };

  const copyReferralCode = () => {
    if (referral?.referralCode) {
      navigator.clipboard.writeText(referral.shareUrl);
      toast.success("Referral link copied!");
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Profile
        </h1>
        <p className="text-xs text-muted-foreground">Manage your account & settings</p>
      </div>

      {/* User header card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-4 flex items-center gap-3"
      >
        <SavvyMascot size={56} variant="happy" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{profile.name || "Anonymous"}</p>
          <p className="text-xs text-muted-foreground truncate">{profile.email || "No email"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        </div>
      </motion.div>

      {/* Referral / Share card */}
      {referral && (
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-amber-400/10 border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Invite friends, earn together</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Share your link — you get <span className="font-bold text-primary">+5 pts</span> instantly,
            and <span className="font-bold text-primary">+25 pts</span> when they install!
          </p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 px-3 py-2 rounded-lg bg-background/60 border border-border text-xs font-mono truncate">
              {referral.shareUrl}
            </div>
            <Button size="sm" variant="outline" className="shrink-0" onClick={copyReferralCode}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold">{referral.shares}</p>
              <p className="text-[10px] text-muted-foreground">Shares</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{referral.installs}</p>
              <p className="text-[10px] text-muted-foreground">Installs</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{referral.totalPoints}</p>
              <p className="text-[10px] text-muted-foreground">Pts earned</p>
            </div>
          </div>
          <Button onClick={handleShare} disabled={shareReferral.isPending} className="w-full" size="sm">
            {shareReferral.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4 mr-1" />}
            Share & earn points
          </Button>
        </div>
      )}

      {/* Name */}
      <FieldRow
        icon={User}
        label="Name"
        value={profile.name || "—"}
        onEdit={() => { setEditingName(!editingName); setName(profile.name || ""); }}
        editing={editingName}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingName(false)}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={saveName} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </FieldRow>

      {/* Email (requires OTP to change) */}
      <FieldRow
        icon={Mail}
        label="Email"
        value={profile.email || "—"}
        onEdit={() => { setEmailMode("enter"); setNewEmail(""); }}
        editing={emailMode !== null}
        badge={profile.email ? "Verified" : undefined}
      >
        {emailMode === "enter" && (
          <>
            <Input
              type="email"
              placeholder="new@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              We'll send a code to verify the new email before changing it.
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEmailMode(null)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={sendEmailChangeOtp} disabled={emailSaving}>
                {emailSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send code"}
              </Button>
            </div>
          </>
        )}
        {emailMode === "otp" && (
          <>
            {devEmailOtp && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center mb-2">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase">Preview code</p>
                <p className="text-lg font-bold tracking-[0.3em] text-amber-600 dark:text-amber-400">{devEmailOtp}</p>
              </div>
            )}
            <Input
              type="text"
              inputMode="numeric"
              placeholder="••••"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-9 text-center tracking-[0.3em]"
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEmailMode("enter")}>Back</Button>
              <Button size="sm" className="flex-1" onClick={verifyEmailChange} disabled={emailSaving || emailOtp.length < 4}>
                {emailSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </>
        )}
      </FieldRow>

      {/* Phone (optional, editable without verification) */}
      <FieldRow
        icon={Phone}
        label="Phone"
        value={profile.phone || "Not set"}
        onEdit={() => { setEditingPhone(!editingPhone); setPhone(profile.phone || ""); }}
        editing={editingPhone}
      >
        <Input
          type="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-9"
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingPhone(false)}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={savePhone} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </FieldRow>

      {/* Profile details for curated insights — DOB, occupation, organization */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Personalize your insights</h3>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">
          By providing this info, Savvy can curate student discounts, corporate perks, and age-based offers for you.
        </p>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Date of birth</Label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Occupation</Label>
          <Select value={occupation || ""} onValueChange={setOccupation}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select your occupation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="student">🎓 Student</SelectItem>
              <SelectItem value="salaried">💼 Salaried / Employed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {occupation === "student" && (
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">School / University (optional)</Label>
            <Input
              placeholder="e.g. IIT Delhi"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="h-9"
            />
          </div>
        )}
        {occupation === "salaried" && (
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Organization (optional)</Label>
            <Input
              placeholder="e.g. Google, Microsoft"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              We'll check if your employer offers subscription perks or reimbursement programs.
            </p>
          </div>
        )}

        <Button
          size="sm"
          className="w-full"
          onClick={saveProfileDetails}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Save details
        </Button>
      </div>

      {/* Country & Currency picker with flags */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Country &amp; Currency</Label>
            <p className="text-sm font-medium">
              {selectedCountry
                ? `${countryByCode(selectedCountry)?.flag || ""} ${countryByCode(selectedCountry)?.name || ""} · ${currency}`
                : `Select your country · ${currency}`}
            </p>
          </div>
        </div>
        <Select value={selectedCountry || ""} onValueChange={handleCountryChange}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Choose your country" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="mr-2 text-base">{c.flag}</span>
                {c.name} · {c.currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground mt-2">
          Currency updates across the whole app instantly. Detected from your location on sign-in.
        </p>
      </div>

      {/* Linked accounts */}
      <div className="glass rounded-2xl p-4">
        <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
          <Link2 className="h-4 w-4 text-primary" />
          Linked accounts
        </h3>
        <div className="space-y-2">
          {[
            { key: "google", label: "Google", color: "#EA4335" },
            { key: "microsoft", label: "Microsoft", color: "#00A4EF" },
            { key: "apple", label: "Apple", color: "#111111" },
            { key: "email", label: "Email", color: "#10b981" },
            { key: "phone", label: "Phone", color: "#f59e0b" },
          ].map((p) => {
            const isLinked = linked?.[p.key as keyof typeof linked] as boolean;
            const account = profile.linkedAccounts.find((a) => a.provider === p.key);
            return (
              <div key={p.key} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.color }}>
                  {p.label[0]}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {account?.identifier || "Not connected"}
                  </p>
                </div>
                {isLinked ? (
                  <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Linked
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Premium Upgrade Card */}
      <PremiumCard />

      {/* Sign out */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive"
        onClick={() => signOut()}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>

      {/* Delete account — requires email OTP verification */}
      {deleteMode === null ? (
        <button
          onClick={() => setDeleteMode("confirm")}
          className="w-full text-xs text-muted-foreground hover:text-destructive transition py-2 flex items-center justify-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete account
        </button>
      ) : deleteMode === "confirm" ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Delete account?</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This permanently deletes your account, all subscriptions, points, rewards, and history.
            <strong className="text-foreground"> This cannot be undone.</strong> We'll send a
            verification code to your email to confirm.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setDeleteMode(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={sendDeleteOtp}
              disabled={deleteSaving}
            >
              {deleteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              Send code
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Enter deletion code</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the code sent to your email to permanently delete your account.
          </p>
          {devDeleteOtp && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase">Preview code</p>
              <p className="text-lg font-bold tracking-[0.3em] text-amber-600 dark:text-amber-400">{devDeleteOtp}</p>
            </div>
          )}
          <Input
            type="text"
            inputMode="numeric"
            placeholder="••••"
            value={deleteOtp}
            onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="h-10 text-center text-xl tracking-[0.3em]"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setDeleteMode("confirm")}>
              Back
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={confirmDelete}
              disabled={deleteSaving || deleteOtp.length < 4}
            >
              {deleteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              Delete forever
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({
  icon: Icon,
  label,
  value,
  onEdit,
  editing,
  badge,
  children,
}: {
  icon: typeof User;
  label: string;
  value: string;
  onEdit: () => void;
  editing: boolean;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</Label>
            {badge && (
              <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {badge}
              </span>
            )}
          </div>
          {!editing && <p className="text-sm font-medium truncate">{value}</p>}
        </div>
        {!editing && (
          <button onClick={onEdit} className="text-xs text-primary font-medium shrink-0">
            Edit
          </button>
        )}
      </div>
      {editing && <div className="mt-3 pl-11">{children}</div>}
    </div>
  );
}

// ─── Premium Upgrade Card ───────────────────────────────────────
function PremiumCard() {
  const [plan, setPlan] = useState<{ plan: string; subscriptionCount: number; freeLimit: number | null; canAddMore: boolean; showPremium: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/account/plan", { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then(setPlan)
      .catch(() => {});
  }, []);

  // Hide Premium card entirely for non-USA users (completely free)
  if (plan && !plan.showPremium) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Could not start checkout");
        setLoading(false);
      }
    } catch {
      toast.error("Could not connect to payment provider");
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Could not open billing portal");
        setLoading(false);
      }
    } catch {
      toast.error("Could not connect to billing portal");
      setLoading(false);
    }
  };

  const isPremium = plan?.plan === "premium";

  return (
    <div className={`rounded-2xl p-4 ${isPremium ? "glass" : "bg-gradient-to-br from-amber-500/15 to-primary/10 border border-amber-500/25"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Crown className={`h-5 w-5 ${isPremium ? "text-primary" : "text-amber-500"}`} />
        <h3 className="font-semibold text-sm">{isPremium ? "Premium Active" : "Upgrade to Premium"}</h3>
      </div>
      {isPremium ? (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            ✨ You're on Premium — unlimited subscriptions, live price insights, and advanced offers.
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={handleManage} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5 mr-1" />}
            Manage subscription
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Unlimited subscriptions (free: {plan?.freeLimit || 3} max)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Live price insights with web search</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Advanced AI offers & deal alerts</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Priority email support</span>
            </div>
          </div>
          {plan && !plan.canAddMore && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2 font-medium">
              ⚠️ You've reached the free limit ({plan.subscriptionCount}/{plan.freeLimit}). Upgrade to add more.
            </p>
          )}
          <Button size="sm" className="w-full bg-gradient-to-r from-amber-500 to-primary" onClick={handleUpgrade} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5 mr-1" />}
            Upgrade to Premium
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Secure payment via Stripe · Cancel anytime
          </p>
        </>
      )}
    </div>
  );
}
