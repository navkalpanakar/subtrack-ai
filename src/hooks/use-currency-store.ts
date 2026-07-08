"use client";

import { create } from "zustand";
import { detectCurrency, setCurrency as persistCurrency, currencySymbol, POPULAR_CURRENCIES } from "@/lib/currency";

// Country → {currency, flag, name, code} map for the country picker.
export const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR" },
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR" },
  { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR" },
  { code: "ES", name: "Spain", flag: "🇪🇸", currency: "EUR" },
  { code: "IT", name: "Italy", flag: "🇮🇹", currency: "EUR" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", currency: "EUR" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", currency: "EUR" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", currency: "EUR" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", currency: "KRW" },
  { code: "CN", name: "China", flag: "🇨🇳", currency: "CNY" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", currency: "MXN" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", currency: "SGD" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currency: "ZAR" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", currency: "TRY" },
  { code: "PL", name: "Poland", flag: "🇵🇱", currency: "PLN" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", currency: "SEK" },
  { code: "NO", name: "Norway", flag: "🇳🇴", currency: "NOK" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", currency: "DKK" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", currency: "CHF" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", currency: "THB" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", currency: "IDR" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", currency: "MYR" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", currency: "PHP" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", currency: "VND" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", currency: "NZD" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", currency: "HKD" },
  { code: "IL", name: "Israel", flag: "🇮🇱", currency: "ILS" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", currency: "ARS" },
  { code: "CL", name: "Chile", flag: "🇨🇱", currency: "CLP" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", currency: "COP" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", currency: "EGP" },
] as const;

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code);
}

export function countryByCurrency(currency: string) {
  return COUNTRIES.find((c) => c.currency === currency);
}

// ─── Global currency store ─────────────────────────────────────
type CurrencyState = {
  currency: string;
  countryCode: string | null;
  setCurrency: (currency: string, countryCode?: string | null) => void;
  init: () => void;
};

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: "USD",
  countryCode: null,
  setCurrency: (currency, countryCode = null) => {
    persistCurrency(currency);
    set({ currency, countryCode });
  },
  init: () => {
    // Only runs client-side
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("subtrack_currency");
    const storedCountry = localStorage.getItem("subtrack_country");
    if (stored) {
      set({ currency: stored, countryCode: storedCountry });
    } else {
      const detected = detectCurrency();
      set({ currency: detected, countryCode: storedCountry });
    }
  },
}));

// Helper hook for formatting amounts with the current global currency.
// Use this in any client component instead of formatCurrency from lib/format.
export function useFormatCurrency() {
  const currency = useCurrencyStore((s) => s.currency);
  return (amount: number, overrideCurrency?: string) => {
    const c = overrideCurrency || currency;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: c,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currencySymbol(c)}${amount.toFixed(2)}`;
    }
  };
}
