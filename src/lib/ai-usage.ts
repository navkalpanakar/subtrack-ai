// AI usage logging helper. Persists each AI call to the `AiUsage` table
// so the admin dashboard can show total calls + estimated cost.
//
// Usage (server-side only — this hits the database):
//
//   import { logAiUsage } from "@/lib/ai-usage";
//   await logAiUsage({ userId, endpoint: "parse", model: "glm-4-flash", tokensIn, tokensOut });
//
// Cost is auto-derived from a small static price table. If you don't
// know token counts, omit them — we'll record 0 cost.

import { db } from "@/lib/db";

// Approximate USD per 1K tokens (June 2025 — update periodically).
const PRICE_PER_1K: Record<string, { input: number; output: number }> = {
  "glm-4-flash": { input: 0.0001, output: 0.0001 },
  "glm-4v-flash": { input: 0.0001, output: 0.0001 },
  "glm-4": { input: 0.002, output: 0.002 },
  "glm-4v": { input: 0.005, output: 0.005 },
  default: { input: 0.001, output: 0.002 },
};

export async function logAiUsage(args: {
  userId?: string | null;
  endpoint: string; // e.g. "parse", "insights", "scan-receipt", "offers", "email-scan"
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number; // optional — overrides auto-derived cost
}): Promise<void> {
  try {
    const tokensIn = Math.max(0, args.tokensIn ?? 0);
    const tokensOut = Math.max(0, args.tokensOut ?? 0);
    let costUsd = args.costUsd ?? 0;
    if (!args.costUsd) {
      const price = PRICE_PER_1K[args.model] ?? PRICE_PER_1K.default;
      costUsd = (tokensIn / 1000) * price.input + (tokensOut / 1000) * price.output;
    }
    await db.aiUsage.create({
      data: {
        userId: args.userId ?? null,
        endpoint: args.endpoint,
        model: args.model,
        tokensIn,
        tokensOut,
        costUsd,
      },
    });
  } catch (e) {
    // Logging should never break the user-facing AI flow.
    console.error("[ai-usage] failed to log:", e);
  }
}
