"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MoreVertical, ExternalLink, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  monthlyEquivalent,
  relativeRenewal,
  daysUntil,
} from "@/lib/format";
import { LOGO_FALLBACKS } from "@/lib/logo";
import { useUpdateSubscription, type Subscription } from "@/hooks/use-subscriptions";
import { useFormatCurrency } from "@/hooks/use-currency-store";

export function SubscriptionCard({
  sub,
  onEdit,
  onDelete,
  compact = false,
}: {
  sub: Subscription;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}) {
  const [logoIdx, setLogoIdx] = useState(0);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountValue, setAmountValue] = useState(String(sub.amount));
  const updateSub = useUpdateSubscription();
  const fmt = useFormatCurrency();
  const days = daysUntil(sub.nextBillingDate);
  const monthly = monthlyEquivalent(Number(sub.amount), sub.billingCycle);
  const urgent = days <= 3 && sub.status === "active";
  const overdue = days < 0 && sub.status === "active";
  const brandColor = sub.color || "#64748b";
  const initials = sub.name.slice(0, 2).toUpperCase();

  const saveAmount = async () => {
    const newAmount = parseFloat(amountValue);
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await updateSub.mutateAsync({ id: sub.id, data: { amount: newAmount } });
      setEditingAmount(false);
      toast.success(`${sub.name} price updated`);
    } catch {
      toast.error("Could not update price");
    }
  };

  // Build the list of logo URLs to try: stored logo first, then fallbacks.
  const logoUrls = sub.logo
    ? [sub.logo, ...LOGO_FALLBACKS(sub.provider || sub.name).filter((u) => u !== sub.logo)]
    : LOGO_FALLBACKS(sub.provider || sub.name);
  const currentLogo = logoUrls[logoIdx];
  const allFailed = logoIdx >= logoUrls.length;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="glass rounded-2xl p-3 flex items-center gap-3"
    >
      {/* Logo — initials always rendered as base layer, brand logo overlaid */}
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative"
        style={{ backgroundColor: brandColor + "20" }}
      >
        <span
          className="font-bold text-sm"
          style={{ color: brandColor }}
        >
          {initials}
        </span>
        {currentLogo && !allFailed && (
          <img
            src={currentLogo}
            alt={sub.name}
            className="h-7 w-7 object-contain absolute inset-0 m-auto"
            onError={() => setLogoIdx((i) => i + 1)}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm truncate">{sub.name}</h3>
          {sub.status !== "active" && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">
              {sub.status}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {sub.category} · {sub.billingCycle}
        </p>
        {!compact && (
          <p
            className={`text-xs mt-0.5 font-medium ${
              overdue
                ? "text-destructive"
                : urgent
                ? "text-amber-500"
                : "text-muted-foreground"
            }`}
          >
            {sub.status === "active" ? relativeRenewal(sub.nextBillingDate) : "Cancelled"}
          </p>
        )}
      </div>

      {/* Amount — tap to edit inline */}
      <div className="text-right shrink-0">
        {editingAmount ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              inputMode="decimal"
              value={amountValue}
              onChange={(e) => setAmountValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveAmount();
                if (e.key === "Escape") setEditingAmount(false);
              }}
              className="h-7 w-16 text-sm text-right px-1"
              autoFocus
            />
            <button
              onClick={saveAmount}
              disabled={updateSub.isPending}
              className="h-6 w-6 rounded flex items-center justify-center text-primary hover:bg-primary/10"
            >
              {updateSub.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => { setEditingAmount(false); setAmountValue(String(sub.amount)); }}
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingAmount(true)}
            className="group text-right"
            title="Tap to edit price"
          >
            <p className="font-bold text-sm group-hover:text-primary transition">
              {fmt(Number(sub.amount))}
            </p>
            <p className="text-[10px] text-muted-foreground group-hover:text-primary/70 transition">
              {fmt(monthly)}/mo
            </p>
          </button>
        )}
      </div>

      {/* Menu */}
      {(onEdit || onDelete || sub.cancelUrl) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 rounded-lg hover:bg-accent flex items-center justify-center shrink-0"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sub.cancelUrl && (
              <DropdownMenuItem asChild>
                <a href={sub.cancelUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Manage / Cancel
                </a>
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(sub.id)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(sub.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
}
