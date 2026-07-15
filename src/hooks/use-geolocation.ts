"use client";

import { useEffect } from "react";
import { useAuth } from "./use-auth";
import { useCurrencyStore } from "./use-currency-store";

// Currency detection priority:
// 1. Server-side IP geolocation (most reliable — reads real client IP from
//    Cloudflare/Nginx headers and calls ipwho.is)
// 2. User's saved currency preference (from DB)
// 3. Browser geolocation (requires permission — often denied)
// 4. Browser locale (last resort)

export function useGeolocation() {
  const { user } = useAuth();
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    // Step 0: Load the user's saved currency from the DB (for returning users)
    const loadSavedCurrency = async () => {
      try {
        const res = await fetch("/api/account/location", {
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (cancelled) return;
        // If the user has a saved currency, use it immediately
        if (data.currency && data.currency.length === 3) {
          setCurrency(data.currency, data.countryCode || null);
        }
      } catch {
        // not critical — continue with detection
      }
    };

    // First load saved currency, THEN run live detection (which may override)
    await loadSavedCurrency();

    // Step 1: Try the server-side IP geolocation (most reliable)
    const detectFromServer = async () => {
      try {
        const res = await fetch("/api/account/detect-location", {
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (cancelled) return;

        if (data.detected && data.currency) {
          // Check if the user already has subscriptions in a DIFFERENT currency.
          // If so, DON'T override — keep the currency their subscriptions are in.
          try {
            const subRes = await fetch("/api/subscriptions", {
              headers: { "Content-Type": "application/json" },
            });
            const subs = await subRes.json();
            if (Array.isArray(subs) && subs.length > 0) {
              const subCurrency = subs[0]?.currency;
              if (subCurrency && subCurrency !== data.currency) {
                // User has subscriptions in a different currency — respect that
                setCurrency(subCurrency, data.countryCode);
                return;
              }
            }
          } catch {
            // If we can't check subscriptions, use the detected currency
          }

          // Use the server-detected currency
          setCurrency(data.currency, data.countryCode);
          return;
        }
      } catch {
        // Server-side detection failed — fall through to client-side
      }

      // Step 2: Fallback to browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!cancelled) reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          },
          () => {
            // Browser geolocation denied/failed — locale detection already
            // ran in the currency store init, so nothing more to do
          },
          { timeout: 8000, enableHighAccuracy: false }
        );
      }
    };

    const reverseGeocode = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const data = await res.json();
        if (cancelled) return;
        const countryCode = data.countryCode || "";
        const COUNTRY_CURRENCY: Record<string, string> = {
          IN: "INR", US: "USD", GB: "GBP", CA: "CAD", AU: "AUD",
          DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
          JP: "JPY", KR: "KRW", CN: "CNY", BR: "BRL", MX: "MXN",
          SG: "SGD", AE: "AED", SA: "SAR", ZA: "ZAR", NG: "NGN",
        };
        const currency = COUNTRY_CURRENCY[countryCode] || "USD";
        setCurrency(currency, countryCode);

        // Persist to the user's account
        await fetch("/api/account/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: data.countryName || "",
            countryCode,
            city: data.city || data.locality || "",
            currency,
          }),
        });
      } catch {
        // geocoding failed — keep locale-based currency
      }
    };

    // Start with server-side detection
    detectFromServer();

    return () => {
      cancelled = true;
    };
  }, [user, setCurrency]);
}
