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
