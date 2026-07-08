import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import ZAI from "z-ai-web-dev-sdk";

// Suggest subscription provider corrections for typos / partial names.
// e.g. "netflx" → "Netflix", "amzn prime" → "Amazon Prime", "spotfy" → "Spotify"
// Returns up to 3 suggestions with the corrected text + provider name.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text || typeof text !== "string" || text.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // Don't suggest if the text already looks correct (contains a clear amount
  // and a recognizable word) — only suggest for short/likely-misspelled input
  const trimmed = text.trim();
  if (trimmed.length > 60) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `You are a subscription-name auto-correct engine. The user typed: "${trimmed}"

If the text contains a misspelled or partial subscription/provider name (e.g. "netflx", "amzn prime", "spotfy", "yt premium", "gpt plus"), suggest the corrected full name. Respond with VALID JSON ONLY:
{
  "hasTypo": boolean,
  "suggestions": [
    { "correctedText": "the full corrected text with the provider name fixed", "provider": "the provider name", "reason": "short reason like 'Did you mean Netflix?'" }
  ]
}
Rules:
- Only suggest if there's a LIKELY typo or partial name. If the text looks correct, return hasTypo: false and empty suggestions.
- Max 3 suggestions, ranked by likelihood.
- Keep the rest of the user's text intact (amount, cycle, date) — only fix the provider name.
- Common aliases to recognize: amzn→Amazon, yt→YouTube, gpt→ChatGPT, ig→Instagram, wa→WhatsApp, gpay→Google Pay, prime→Amazon Prime, max→HBO Max, apple tv→Apple TV+.`,
        },
        { role: "user", content: trimmed },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content || '{"hasTypo":false,"suggestions":[]}';
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      hasTypo: boolean;
      suggestions: Array<{ correctedText: string; provider: string; reason: string }>;
    };
    return NextResponse.json({
      hasTypo: parsed.hasTypo || false,
      suggestions: (parsed.suggestions || []).slice(0, 3),
    });
  } catch {
    return NextResponse.json({ hasTypo: false, suggestions: [] });
  }
}
