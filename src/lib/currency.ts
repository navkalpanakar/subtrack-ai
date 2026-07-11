// Locale → currency detection. Used to default new subscriptions to the
// user's local currency instead of always USD.

const LOCALE_TO_CURRENCY: Record<string, string> = {
  // India
  "en-in": "INR",
  "hi-in": "INR",
  "ta-in": "INR",
  "te-in": "INR",
  "mr-in": "INR",
  "bn-in": "INR",
  "gu-in": "INR",
  "kn-in": "INR",
  "ml-in": "INR",
  "pa-in": "INR",
  // US
  "en-us": "USD",
  "es-us": "USD",
  // UK
  "en-gb": "GBP",
  // Eurozone
  "de-de": "EUR",
  "fr-fr": "EUR",
  "es-es": "EUR",
  "it-it": "EUR",
  "nl-nl": "EUR",
  "pt-pt": "EUR",
  "ie-ie": "EUR",
  "at-at": "EUR",
  "be-be": "EUR",
  "fi-fi": "EUR",
  "el-gr": "EUR",
  "de-at": "EUR",
  // Other major
  "en-au": "AUD",
  "en-nz": "NZD",
  "en-ca": "CAD",
  "fr-ca": "CAD",
  "ja-jp": "JPY",
  "ko-kr": "KRW",
  "zh-cn": "CNY",
  "zh-tw": "TWD",
  "zh-hk": "HKD",
  "ru-ru": "RUB",
  "pt-br": "BRL",
  "es-mx": "MXN",
  "en-sg": "SGD",
  "en-hk": "HKD",
  "en-za": "ZAR",
  "en-ng": "NGN",
  "en-ae": "AED",
  "ar-sa": "SAR",
  "tr-tr": "TRY",
  "pl-pl": "PLN",
  "sv-se": "SEK",
  "nb-no": "NOK",
  "da-dk": "DKK",
  "fi-fi": "EUR",
  "cs-cz": "CZK",
  "hu-hu": "HUF",
  "ro-ro": "RON",
  "th-th": "THB",
  "id-id": "IDR",
  "ms-my": "MYR",
  "vi-vn": "VND",
  "fil-ph": "PHP",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  KRW: "₩",
  CNY: "¥",
  AUD: "A$",
  CAD: "C$",
  NZD: "NZ$",
  SGD: "S$",
  HKD: "HK$",
  TWD: "NT$",
  RUB: "₽",
  BRL: "R$",
  MXN: "Mex$",
  ZAR: "R",
  AED: "د.إ",
  SAR: "﷼",
  TRY: "₺",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  THB: "฿",
  MYR: "RM",
  PHP: "₱",
  NGN: "₦",
};

export function detectCurrency(): string {
  if (typeof window === "undefined") return "USD";
  // Try stored preference first
  const stored = localStorage.getItem("subtrack_currency");
  if (stored && stored.length === 3) return stored;
  // Detect from browser locale
  const locales = [navigator.language, ...(navigator.languages || [])];
  for (const loc of locales) {
    const key = loc.toLowerCase();
    if (LOCALE_TO_CURRENCY[key]) {
      localStorage.setItem("subtrack_currency", LOCALE_TO_CURRENCY[key]);
      return LOCALE_TO_CURRENCY[key];
    }
    // Try just the region part
    const region = key.split("-")[1];
    if (region) {
      const match = Object.entries(LOCALE_TO_CURRENCY).find(([k]) => k.endsWith(`-${region}`));
      if (match) {
        localStorage.setItem("subtrack_currency", match[1]);
        return match[1];
      }
    }
  }
  return "USD";
}

export function setCurrency(currency: string) {
  if (currency && currency.length === 3) {
    localStorage.setItem("subtrack_currency", currency.toUpperCase());
  }
}

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export const POPULAR_CURRENCIES = [
  "USD",
  "INR",
  "EUR",
  "GBP",
  "AUD",
  "CAD",
  "JPY",
  "SGD",
  "AED",
  "BRL",
];

// ─── Localized prize amounts ──────────────────────────────────
// "Nice" round-number reward values per currency for the weekly
// leaderboard top prize (≈ $25 USD). Defined per-currency to avoid
// ugly conversion artifacts (e.g. ₹2,083.17 → ₹2,000).
export const WEEKLY_PRIZE_BY_CURRENCY: Record<string, number> = {
  USD: 25, INR: 2000, GBP: 20, EUR: 25, AUD: 35, CAD: 35,
  NZD: 40, JPY: 3000, KRW: 30000, CNY: 150, SGD: 35, HKD: 200,
  TWD: 750, RUB: 2000, BRL: 150, MXN: 500, ZAR: 400, NGN: 10000,
  AED: 100, SAR: 100, TRY: 800, PLN: 100, SEK: 250, NOK: 250,
  DKK: 175, CHF: 25, THB: 900, IDR: 400000, MYR: 120, PHP: 1500,
  VND: 650000, CZK: 600, HUF: 9000, RON: 120, ILS: 100,
  ARS: 25000, CLP: 23000, COP: 100000, EGP: 1200,
};

// ─── Savings milestone (Centurion badge) ──────────────────────
// The "big saver" milestone, expressed as a nice round number per
// currency (≈ $100 USD). Used for badge detail text.
export const SAVINGS_MILESTONE_BY_CURRENCY: Record<string, number> = {
  USD: 100, INR: 8000, GBP: 80, EUR: 100, AUD: 150, CAD: 140,
  NZD: 170, JPY: 12000, KRW: 120000, CNY: 600, SGD: 140, HKD: 800,
  TWD: 3000, RUB: 8000, BRL: 600, MXN: 2000, ZAR: 1600, NGN: 40000,
  AED: 400, SAR: 400, TRY: 3500, PLN: 400, SEK: 1000, NOK: 1000,
  DKK: 700, CHF: 100, THB: 3600, IDR: 1600000, MYR: 480, PHP: 6000,
  VND: 2600000, CZK: 2400, HUF: 36000, RON: 480, ILS: 400,
  ARS: 100000, CLP: 92000, COP: 400000, EGP: 4800,
};

// Format an amount in the given currency with the proper symbol.
// Falls back gracefully if Intl is unavailable.
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currencySymbol(currency)}${Math.round(amount).toLocaleString()}`;
  }
}

// Get the localized weekly prize amount for a currency (default $25 USD).
export function weeklyPrizeAmount(currency: string): number {
  return WEEKLY_PRIZE_BY_CURRENCY[currency] ?? 25;
}

// Get the localized savings milestone for a currency (default 100 USD).
export function savingsMilestoneAmount(currency: string): number {
  return SAVINGS_MILESTONE_BY_CURRENCY[currency] ?? 100;
}
