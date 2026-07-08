// Centralized AI helpers (server-only). Wraps z-ai-web-dev-sdk for
// natural-language parsing, receipt vision scanning, savings insights,
// and live-offer web search.

import ZAI from "z-ai-web-dev-sdk";

export type ParsedSubscription = {
  name: string;
  provider: string;
  category: string;
  amount: number | null;
  currency: string;
  billingCycle: "monthly" | "yearly" | "weekly" | "quarterly" | null;
  nextBillingDate: string | null; // ISO date
  notes?: string;
};

export type PriceVerification = {
  needsVerification: boolean;
  userAmount: number | null;
  expectedAmount: number | null;
  reason: string;
};

const zaiPromise = ZAI.create();
function getZai() {
  return zaiPromise;
}

// Minimal currency symbol map for the AI prompts (avoids importing the client-side
// currency lib into server code).
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$", INR: "₹", EUR: "€", GBP: "£", JPY: "¥", KRW: "₩",
    CNY: "¥", AUD: "A$", CAD: "C$", NZD: "NZ$", SGD: "S$", HKD: "HK$",
    TWD: "NT$", RUB: "₽", BRL: "R$", MXN: "Mex$", ZAR: "R", AED: "AED",
    SAR: "SAR", TRY: "₺", SEK: "kr", NOK: "kr", DKK: "kr", PLN: "zł",
    CZK: "Kč", THB: "฿", MYR: "RM", PHP: "₱", NGN: "₦", CHF: "CHF",
    ILS: "₪", ARS: "$", CLP: "$", COP: "$", EGP: "E£",
  };
  return symbols[currency] || currency;
}

/**
 * Parse free-form natural-language text into a structured subscription.
 * Examples it handles:
 *  - "Netflix $15.49 monthly renews on the 5th"
 *  - "Spotify 11.99 every month"
 *  - "Adobe CC $59.99/mo renews the 22nd"
 * The `currency` param defaults the parsed currency (e.g. INR for India).
 */
export async function parseSubscriptionText(
  text: string,
  currency = "USD"
): Promise<ParsedSubscription> {
  const zai = await getZai();
  const today = new Date().toISOString().slice(0, 10);

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: "assistant",
        content: `You are a subscription parser. Extract subscription details from user text and respond with VALID JSON ONLY (no markdown, no prose). Today is ${today}. The user's local currency is ${currency} — use it unless the text explicitly states another currency.
Schema:
{
  "name": string,
  "provider": string,
  "category": "Streaming"|"Music"|"Cloud"|"Productivity"|"AI"|"Shopping"|"Gaming"|"News"|"Health"|"Education"|"Other",
  "amount": number|null,
  "currency": "${currency}",
  "billingCycle": "monthly"|"yearly"|"weekly"|"quarterly"|null,
  "nextBillingDate": "YYYY-MM-DD"|null,
  "notes": string
}
If a field is unknown use null. Infer the next billing date from phrases like "renews the 5th", "on the 22nd", etc., picking the next upcoming date from today. Pick a fitting category.`,
      },
      { role: "user", content: text },
    ],
    thinking: { type: "disabled" },
  });

  const raw = completion.choices[0]?.message?.content || "";
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as ParsedSubscription;
    // Ensure currency defaults to the user's local currency if model omitted it
    if (!parsed.currency || parsed.currency === "USD") {
      parsed.currency = currency;
    }
    return parsed;
  } catch {
    return {
      name: text.slice(0, 40),
      provider: text.slice(0, 40),
      category: "Other",
      amount: null,
      currency,
      billingCycle: "monthly",
      nextBillingDate: null,
      notes: "Could not auto-parse, please review.",
    };
  }
}

/**
 * Verify a parsed subscription's price against live web data. Returns a
 * verification result indicating whether the user's stated price seems off
 * (>20% below the web-found price), so the UI can ask for confirmation.
 */
export async function verifySubscriptionPrice(
  provider: string,
  userAmount: number,
  currency: string,
  billingCycle: string | null
): Promise<PriceVerification> {
  if (!provider || !userAmount || userAmount <= 0) {
    return { needsVerification: false, userAmount, expectedAmount: null, reason: "" };
  }
  const zai = await getZai();
  try {
    const results = await zai.functions.invoke("web_search", {
      query: `${provider} subscription plan price ${new Date().getFullYear()} ${currency}`,
      num: 6,
    });
    if (!Array.isArray(results) || results.length === 0) {
      return { needsVerification: false, userAmount, expectedAmount: null, reason: "" };
    }
    const snippets = results
      .map((r: { name?: string; snippet?: string }) => `${r.name || ""}: ${r.snippet || ""}`)
      .join("\n");

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `You verify subscription prices. The user said they pay ${userAmount} ${currency} ${billingCycle || "monthly"} for ${provider}. Based on these web search results, find the closest matching plan's current price. Respond with VALID JSON ONLY:
{
  "expectedAmount": number|null,
  "matches": boolean,
  "reason": string (1 sentence explaining what price you found and from what plan)
}
If you can't find a clear price, set expectedAmount to null and matches to true.`,
        },
        { role: "user", content: `User: ${userAmount} ${currency} ${billingCycle} for ${provider}\n\nWeb results:\n${snippets}` },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      expectedAmount: number | null;
      matches: boolean;
      reason: string;
    };

    let expected = parsed.expectedAmount;
    // If the model didn't return a numeric expectedAmount, try to extract one
    // from the reason text (e.g. "the cheapest plan is 149 INR").
    if (expected === null && parsed.reason) {
      const m = parsed.reason.match(/(?:£|€|\$|₹|Rs\.?\s?)?(\d+(?:\.\d{1,2})?)/);
      if (m) {
        expected = parseFloat(m[1]);
      }
    }

    // Trigger verification if web price is >20% higher than user's stated price,
    // OR the model explicitly said it doesn't match.
    const needsVerification =
      (expected !== null && expected > 0 && userAmount < expected * 0.8) ||
      parsed.matches === false;

    return {
      needsVerification,
      userAmount,
      expectedAmount: expected,
      reason: parsed.reason || "",
    };
  } catch {
    return { needsVerification: false, userAmount, expectedAmount: null, reason: "" };
  }
}

/**
 * Scan a receipt / billing email screenshot (base64 data URL) and extract
 * subscription details using the Vision Language Model.
 */
export async function scanReceiptImage(
  dataUrl: string
): Promise<ParsedSubscription[]> {
  const zai = await getZai();
  const today = new Date().toISOString().slice(0, 10);

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a receipt scanner for subscription billing. Extract every subscription shown in this image. Respond with VALID JSON ONLY (no markdown): an array of objects with this schema. Today is ${today}.
[{
  "name": string,
  "provider": string,
  "category": "Streaming"|"Music"|"Cloud"|"Productivity"|"AI"|"Shopping"|"Gaming"|"News"|"Health"|"Education"|"Other",
  "amount": number,
  "currency": "USD",
  "billingCycle": "monthly"|"yearly"|"weekly"|"quarterly",
  "nextBillingDate": "YYYY-MM-DD"|null,
  "notes": string
}]
If no subscription is found, return [].`,
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: "disabled" },
  });

  const raw = response.choices[0]?.message?.content || "[]";
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type Insight = {
  type: "saving" | "alert" | "tip" | "overlap";
  title: string;
  detail: string;
  potentialSaving?: number;
  provider?: string;
  action?: "find_annual" | "find_student" | "find_alternative" | "cancel" | "downgrade" | "search_offer";
};

/**
 * Generate smart savings insights from a user's subscription list.
 * Fetches LIVE current prices via web search so insights reflect real
 * market prices (not just what the user entered). Also uses the user's
 * occupation (student/salaried) for curated discount suggestions.
 */
export async function generateInsights(
  subscriptions: Array<{
    name: string;
    provider: string;
    category: string;
    amount: number;
    billingCycle: string;
    usageTags: string;
    currency?: string;
  }>,
  userCurrency = "USD",
  userProfile?: {
    occupation?: string | null;
    organization?: string | null;
    dateOfBirth?: string | null;
  }
): Promise<Insight[]> {
  const zai = await getZai();
  const currencySymbol = getCurrencySymbol(userCurrency);

  // ─── Fetch LIVE current prices via web search ──────────────────
  // This makes insights genuinely useful — we compare what the user pays
  // vs the real current market price. Limited to 3 subs for speed.
  const livePrices: string[] = [];
  const subsToSearch = subscriptions.slice(0, 3); // limit to 3 for speed
  for (const sub of subsToSearch) {
    try {
      const results = await zai.functions.invoke("web_search", {
        query: `${sub.provider} subscription price ${userCurrency}`,
        num: 2,
      });
      if (Array.isArray(results) && results.length > 0) {
        const snippets = results
          .map((r: { snippet?: string }) => r.snippet || "")
          .filter(Boolean)
          .join(" | ");
        if (snippets) {
          livePrices.push(`${sub.name}: ${snippets.slice(0, 200)}`);
        }
      }
    } catch {
      // skip — insights still work without live prices
    }
  }
  const livePriceContext = livePrices.length > 0
    ? `\n\nLIVE WEB PRICES (current market data):\n${livePrices.join("\n")}`
    : "";

  // ─── Build user profile context for curated insights ───────────
  const occupation = userProfile?.occupation;
  const organization = userProfile?.organization;
  let profileContext = "";
  if (occupation === "student") {
    profileContext += "\n\nUSER IS A STUDENT: Prioritize student discounts, education pricing, .edu email offers, Spotify Premium Student, YouTube Premium Student, Apple Music Student, Notion Education, GitHub Student Developer Pack, etc. Suggest student-specific savings.";
  } else if (occupation === "salaried") {
    profileContext += "\n\nUSER IS SALARIED: Suggest annual billing savings, corporate perks, and employer reimbursement programs.";
    if (organization) {
      profileContext += ` The user works at ${organization} — check if that company offers any subscription perks, corporate discounts, or reimbursement programs (e.g., Google employees get Google services, Microsoft employees get Microsoft 365, etc.).`;
    }
  }

  const summary = subscriptions
    .map(
      (s) =>
        `- ${s.name} (${s.provider}) | ${s.category} | user pays ${currencySymbol}${s.amount}/${s.billingCycle} | tags: ${s.usageTags || "none"}`
    )
    .join("\n");

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: "assistant",
        content: `You are a sharp subscription-finance advisor with access to LIVE web pricing data. Analyze the user's subscriptions and return 3-6 actionable insights as VALID JSON ONLY (no markdown).

You have TWO data sources:
1. What the user PAYS (their entered amounts)
2. LIVE web search results showing CURRENT market prices

Use the live prices to detect: price hikes, plan mismatches (user paying for a higher tier than needed), cheaper plans available, and current promotions.

CRITICAL CURRENCY RULE: The user's currency is ${userCurrency} (symbol: ${currencySymbol}). You MUST use ${currencySymbol} for EVERY amount. Do NOT use $, USD, ₹, INR, or any other symbol.

CRITICAL SAVINGS RULE: potentialSaving must be REALISTIC and never exceed the monthly cost. These are ALTERNATIVE options (user picks ONE). Examples:
- Switching to annual might save ~17% (2 months free / 12)
- Student discount typically saves 50%
- Downgrading a plan saves the price difference
- Do NOT suggest savings greater than what the user actually pays

${subscriptions.length === 1 ? "NOTE: Only 1 subscription. Focus on: annual plan, student discounts, price hike alerts, cheaper plans (from live data). Do NOT suggest 'overlapping services'." : "Focus on: overlapping services, price hikes (compare user's price vs live price), underused categories, bundle opportunities, annual vs monthly."}

Each insight should include an "action" field describing what the user can do:
- "find_annual" → search for annual plan pricing
- "find_student" → search for student/education discount
- "find_alternative" → search for cheaper alternatives
- "cancel" → cancel this subscription (link to cancel URL)
- "downgrade" → downgrade to a cheaper plan
- "search_offer" → search for current promo codes/deals

Schema:
[{
  "type": "saving"|"alert"|"tip"|"overlap",
  "title": string (max 60 chars),
  "detail": string (1-2 sentences, comparing user's price vs live price where relevant, ALL amounts in ${currencySymbol}),
  "potentialSaving": number (realistic monthly savings in ${userCurrency}, 0 if none),
  "provider": string (relevant provider name or null),
  "action": "find_annual"|"find_student"|"find_alternative"|"cancel"|"downgrade"|"search_offer"
}]`,
      },
      { role: "user", content: `My subscriptions (user pays these amounts in ${userCurrency}):\n${summary}${livePriceContext}${profileContext}` },
    ],
    thinking: { type: "disabled" },
  });

  const raw = completion.choices[0]?.message?.content || "[]";
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    console.error("[insights] LLM returned non-array:", typeof parsed);
    return [];
  } catch (e) {
    console.error("[insights] JSON parse failed:", e, "raw:", raw.slice(0, 200));
    return [];
  }
}

export type Offer = {
  provider: string;
  title: string;
  detail: string;
  url: string;
  validUntil?: string;
  discount?: string;
};

/**
 * Search the web for current offers / deals from a subscription provider.
 */
export async function findProviderOffers(providerName: string): Promise<Offer[]> {
  const zai = await getZai();
  try {
    const results = await zai.functions.invoke("web_search", {
      query: `${providerName} subscription deal discount promo offer 2025`,
      num: 6,
    });

    if (!Array.isArray(results)) return [];

    const offers: Offer[] = results
      .filter(
        (r: { name?: string; snippet?: string; url?: string }) =>
          r.name && r.url
      )
      .slice(0, 4)
      .map((r: { name: string; snippet: string; url: string; date?: string }) => ({
        provider: providerName,
        title: r.name,
        detail: r.snippet || "",
        url: r.url,
        validUntil: r.date || undefined,
      }));

    return offers;
  } catch {
    return [];
  }
}

/**
 * Parse pasted email/text content and extract subscription mentions.
 * Used by the "email scan / one-click sync" feature.
 */
export async function parseEmailForSubscriptions(
  content: string
): Promise<ParsedSubscription[]> {
  const zai = await getZai();
  const today = new Date().toISOString().slice(0, 10);

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: "assistant",
        content: `You scan email bodies / pasted text for subscription billing mentions. Extract every subscription you can identify. Respond with VALID JSON ONLY (no markdown): an array. Today is ${today}.
[{
  "name": string,
  "provider": string,
  "category": "Streaming"|"Music"|"Cloud"|"Productivity"|"AI"|"Shopping"|"Gaming"|"News"|"Health"|"Education"|"Other",
  "amount": number|null,
  "currency": "USD",
  "billingCycle": "monthly"|"yearly"|"weekly"|"quarterly"|null,
  "nextBillingDate": "YYYY-MM-DD"|null,
  "notes": string
}]
If none found, return [].`,
      },
      { role: "user", content: content.slice(0, 6000) },
    ],
    thinking: { type: "disabled" },
  });

  const raw = completion.choices[0]?.message?.content || "[]";
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
