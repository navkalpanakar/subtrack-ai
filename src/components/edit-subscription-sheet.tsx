"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
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
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useSubscriptions, useUpdateSubscription, type Subscription } from "@/hooks/use-subscriptions";
import { CATEGORIES, CYCLES } from "@/lib/format";
import { currencySymbol, POPULAR_CURRENCIES } from "@/lib/currency";

// Full edit sheet for an existing subscription. Opens when the user taps
// "Edit" on a subscription card. Lets them fix any field — name, provider,
// amount, currency, billing cycle, next billing date, cancel URL.
export function EditSubscriptionSheet({
  subscriptionId,
  open,
  onOpenChange,
}: {
  subscriptionId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: subs } = useSubscriptions();
  const updateSub = useUpdateSubscription();
  const [draft, setDraft] = useState<Partial<Subscription> | null>(null);

  useEffect(() => {
    if (subscriptionId && subs) {
      const sub = subs.find((s) => s.id === subscriptionId);
      if (sub) {
        const newDraft = {
          id: sub.id,
          name: sub.name,
          provider: sub.provider,
          category: sub.category,
          amount: sub.amount,
          currency: sub.currency,
          billingCycle: sub.billingCycle,
          nextBillingDate: sub.nextBillingDate.slice(0, 10),
          cancelUrl: sub.cancelUrl,
        };
        const t = setTimeout(() => setDraft(newDraft), 0);
        return () => clearTimeout(t);
      }
    }
  }, [subscriptionId, subs]);

  const handleSave = async () => {
    if (!draft || !subscriptionId) return;
    await updateSub.mutateAsync({
      id: subscriptionId,
      data: {
        name: draft.name,
        provider: draft.provider,
        category: draft.category,
        amount: Number(draft.amount) || 0,
        currency: draft.currency,
        billingCycle: draft.billingCycle,
        nextBillingDate: draft.nextBillingDate,
        cancelUrl: draft.cancelUrl,
      },
    });
    toast.success("Subscription updated");
    onOpenChange(false);
  };

  if (!draft) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Edit subscription
          </DrawerTitle>
          <DrawerDescription>
            Fix any field Savvy got wrong, then save.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={draft.name || ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Input
                value={draft.provider || ""}
                onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={draft.category || "Other"}
                onValueChange={(v) => setDraft({ ...draft, category: v })}
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
                value={String(draft.amount ?? "")}
                onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select
                value={draft.currency || "USD"}
                onValueChange={(v) => setDraft({ ...draft, currency: v })}
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
                value={draft.billingCycle || "monthly"}
                onValueChange={(v) => setDraft({ ...draft, billingCycle: v })}
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
                value={draft.nextBillingDate || ""}
                onChange={(e) => setDraft({ ...draft, nextBillingDate: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Cancel URL (optional)</Label>
              <Input
                placeholder="https://…"
                value={draft.cancelUrl || ""}
                onChange={(e) => setDraft({ ...draft, cancelUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateSub.isPending || !draft.name} className="flex-1">
              {updateSub.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Save changes
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
