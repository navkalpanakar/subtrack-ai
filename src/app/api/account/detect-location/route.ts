import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// Server-side IP geolocation. Reads the user's real IP from request headers
// (CF-Connecting-IP for Cloudflare, X-Forwarded-For for Nginx) and calls a
// reliable IP geolocation service. Much more reliable than client-side
// ipapi.co which gets blocked/rate-limited.

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

function getClientIP(req: NextRequest): string | null {
  // Cloudflare proxy sets this header with the real client IP
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP.trim();

  // Nginx / standard reverse proxy
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first && first !== "unknown") return first;
  }

  // X-Real-IP (some proxies)
  const xRealIP = req.headers.get("x-real-ip");
  if (xRealIP) return xRealIP.trim();

  return null;
}

async function gelocateIP(ip: string): Promise<{
  country: string;
  countryCode: string;
  city: string;
} | null> {
  // Try ipwho.is first (free, no key, reliable, supports CORS)
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.success !== false && data.country_code) {
      return {
        country: data.country || "",
        countryCode: data.country_code || "",
        city: data.city || "",
      };
    }
  } catch {
    // fall through to next service
  }

  // Fallback: ip-api.com (free, no key, but HTTP only from some networks)
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.countryCode) {
      return {
        country: data.country || "",
        countryCode: data.countryCode || "",
        city: data.city || "",
      };
    }
  } catch {
    // both services failed
  }

  return null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the user's real IP
  const clientIP = getClientIP(req);

  if (!clientIP) {
    return NextResponse.json({
      detected: false,
      message: "Could not determine client IP",
    });
  }

  // Geolocate the IP
  const location = await gelocateIP(clientIP);
  if (!location || !location.countryCode) {
    return NextResponse.json({
      detected: false,
      ip: clientIP,
      message: "Geolocation failed",
    });
  }

  // Determine currency from country code
  const currency = COUNTRY_CURRENCY[location.countryCode] || "USD";

  // Persist to the user's account
  await db.user.update({
    where: { id: userId },
    data: {
      country: location.country,
      countryCode: location.countryCode,
      city: location.city,
      currency,
    },
  });

  return NextResponse.json({
    detected: true,
    ip: clientIP,
    country: location.country,
    countryCode: location.countryCode,
    city: location.city,
    currency,
  });
}
