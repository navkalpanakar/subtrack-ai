"use client";

import { useEffect } from "react";
import { useAuth } from "./use-auth";
import { useCurrencyStore } from "./use-currency-store";
import { detectCurrency } from "@/lib/currency";

// Country code → currency mapping (superset of the locale map).
const COUNTRY_CURRENCY: Record<string, string> = {
  IN: "INR", US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", PT: "EUR",
  IE: "EUR", AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR",
  JP: "JPY", KR: "KRW", CN: "CNY", TW: "TWD", HK: "HKD",
  RU: "RUB", BR: "BRL", MX: "MXN", SG: "SGD", ZA: "ZAR",
  NG: "NGN", AE: "AED", SA: "SAR", TR: "TRY", PL: "PLN",
  SE: "SEK", NO: "NOK", DK: "DKK", CZ: "CZK", HU: "HUF",
  RO: "RON", TH: "THB", ID: "IDR", MY: "MYR", VN: "VND",
  PH: "PHP", CH: "CHF", IL: "ILS",
};

export function useGeolocation() {
  const { user } = useAuth();
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const saveLocation = async (country: string, countryCode: string, city: string) => {
      // Determine currency from country code
      const currency = COUNTRY_CURRENCY[countryCode] || "USD";
      // Update the global currency store (reactive — all components update)
      setCurrency(currency, countryCode);
      // Persist to the user's account
      try {
        await fetch("/api/account/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country, countryCode, city, currency }),
        });
      } catch {
        // silent fail — location is non-critical
      }
    };

    const reverseGeocode = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const data = await res.json();
        if (cancelled) return;
        const country = data.countryName || "";
        const countryCode = data.countryCode || "";
        const city = data.city || data.locality || data.principalSubdivision || "";
        if (country) {
          saveLocation(country, countryCode, city);
        }
      } catch {
        // geocoding failed — keep locale-based currency
      }
    };

    // Try browser geolocation first (most accurate)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) {
            reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          }
        },
        () => {
          fallbackToIP();
        },
        { timeout: 8000, enableHighAccuracy: false }
      );
    } else {
      fallbackToIP();
    }

    async function fallbackToIP() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (cancelled) return;
        if (data.country_name) {
          saveLocation(data.country_name, data.country_code || "", data.city || "");
        }
      } catch {
        // IP geolocation also failed — keep locale-based currency from detectCurrency()
        detectCurrency();
      }
    }

    return () => {
      cancelled = true;
    };
  }, [user, setCurrency]);
}
