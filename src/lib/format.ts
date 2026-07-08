export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function monthlyEquivalent(amount: number, cycle: string): number {
  switch (cycle) {
    case "yearly":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "weekly":
      return (amount * 52) / 12;
    case "monthly":
    default:
      return amount;
  }
}

export function yearlyEquivalent(amount: number, cycle: string): number {
  return monthlyEquivalent(amount, cycle) * 12;
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function relativeRenewal(date: Date | string): string {
  const days = daysUntil(date);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Renews today";
  if (days === 1) return "Renews tomorrow";
  if (days <= 7) return `In ${days} days`;
  if (days <= 31) return `In ${Math.ceil(days / 7)} wk`;
  return `In ${Math.round(days / 30)} mo`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Streaming: "#E50914",
  Music: "#1DB954",
  Cloud: "#3693F3",
  Productivity: "#6366F1",
  AI: "#10A37F",
  Shopping: "#FF9900",
  Gaming: "#9146FF",
  News: "#8B5CF6",
  Health: "#EF4444",
  Education: "#F59E0B",
  Other: "#64748B",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

export const CATEGORIES = [
  "Streaming",
  "Music",
  "Cloud",
  "Productivity",
  "AI",
  "Shopping",
  "Gaming",
  "News",
  "Health",
  "Education",
  "Other",
] as const;

export const CYCLES = ["monthly", "yearly", "quarterly", "weekly"] as const;
