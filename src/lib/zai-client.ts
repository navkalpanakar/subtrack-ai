// Thin wrapper around the Z.ai PUBLIC API (Zhipu Open Platform).
//
// WHY THIS EXISTS:
// The `z-ai-web-dev-sdk` package only talks to `internal-api.z.ai`, which
// resolves to private IPs (172.25.x.x) reachable ONLY inside the Z.ai
// sandbox. On a public server (Oracle Cloud, AWS, Vercel...) those IPs
// time out.
//
// The Z.ai public API at `https://api.z.ai/api/paas/v4` is reachable from
// anywhere and uses the same GLM-4 family of models. This wrapper calls it
// directly via fetch() with a real API key, keeping the same interface the
// rest of the app expects.
//
// SETUP:
// 1. Get an API key from https://z.ai (Z.ai open platform console)
// 2. Add to .env:  ZAI_API_KEY=your_key_here
// 3. That's it — this module auto-detects the key and uses the public API.
//    If ZAI_API_KEY is not set, it falls back to the sandbox SDK (for dev
//    inside the Z.ai sandbox).

import ZAI from "z-ai-web-dev-sdk";

const PUBLIC_BASE_URL = "https://api.z.ai/api/paas/v4";

// Default models (free tier friendly)
const TEXT_MODEL = "glm-4-flash"; // free, fast, good for parsing/insights
const TEXT_MODEL_STRONG = "glm-4-plus"; // better reasoning for insights
const VISION_MODEL = "glm-4v-flash"; // free vision model for receipt scanning

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type VisionContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type VisionMessage = {
  role: "user" | "assistant" | "system";
  content: VisionContent[] | string;
};

export type ChatCompletionResponse = {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
    index: number;
  }>;
  id: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type SearchResult = {
  name?: string;
  snippet?: string;
  url?: string;
  date?: string;
  title?: string;
  content?: string;
  link?: string;
};

// ─── Config resolution ──────────────────────────────────────────
function getApiKey(): string | null {
  // Check env var first (production / public server)
  const envKey = process.env.ZAI_API_KEY;
  if (envKey && envKey.length > 5) return envKey;
  return null;
}

export function isPublicApiConfigured(): boolean {
  return getApiKey() !== null;
}

// ─── Text chat completion (public API) ─────────────────────────
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    thinking?: "enabled" | "disabled";
  }
): Promise<string> {
  const apiKey = getApiKey();

  // Fallback to sandbox SDK if no public API key (dev in sandbox)
  if (!apiKey) {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: options?.thinking === "enabled" ? "enabled" : "disabled" },
    } as Parameters<typeof zai.chat.completions.create>[0]);
    return completion.choices[0]?.message?.content || "";
  }

  const body = {
    model: options?.model || TEXT_MODEL,
    messages,
    temperature: options?.temperature ?? 0.7,
    thinking: { type: options?.thinking === "enabled" ? "enabled" : "disabled" },
  };

  const res = await fetch(`${PUBLIC_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Z.ai API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content || "";
}

// ─── Vision chat completion (public API) ───────────────────────
export async function visionCompletion(
  messages: VisionMessage[],
  options?: { model?: string }
): Promise<string> {
  const apiKey = getApiKey();

  // Fallback to sandbox SDK
  if (!apiKey) {
    const zai = await ZAI.create();
    const response = await zai.chat.completions.createVision({
      messages: messages as Parameters<typeof zai.chat.completions.createVision>[0]["messages"],
      thinking: { type: "disabled" },
    });
    return response.choices[0]?.message?.content || "";
  }

  const body = {
    model: options?.model || VISION_MODEL,
    messages,
    thinking: { type: "disabled" },
  };

  const res = await fetch(`${PUBLIC_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Z.ai Vision API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  return data.choices[0]?.message?.content || "";
}

// ─── Web search (public API via tools endpoint) ────────────────
// The Z.ai public API supports web search through the chat completions
// endpoint with the web_search tool enabled. We use a minimal system
// prompt to get raw search results back as text.
export async function webSearch(
  query: string,
  numResults = 6
): Promise<SearchResult[]> {
  const apiKey = getApiKey();

  // Fallback to sandbox SDK
  if (!apiKey) {
    const zai = await ZAI.create();
    const results = await zai.functions.invoke("web_search", {
      query,
      num: numResults,
    });
    return Array.isArray(results) ? (results as SearchResult[]) : [];
  }

  try {
    // Use GLM-4 with web_search tool — the model searches and returns
    // results with citations. We parse the response for URLs + snippets.
    const body = {
      model: TEXT_MODEL,
      messages: [
        {
          role: "user",
          content: `Search the web for: "${query}". List the top ${numResults} results with their URLs and a brief snippet from each. Format as JSON array: [{"name":"title","snippet":"text","url":"https://..."}]`,
        },
      ],
      tools: [{ type: "web_search", web_search: { enable: true, search_result: true } }],
      thinking: { type: "disabled" },
    };

    const res = await fetch(`${PUBLIC_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Fallback: try a plain LLM completion without the search tool
      return fallbackSearch(query, numResults);
    }

    const data = (await res.json()) as ChatCompletionResponse & {
      web_search?: Array<{ title?: string; content?: string; link?: string; media?: string }>;
      choices?: Array<{ message: { content: string; tool_calls?: unknown[] } }>;
    };

    // The web_search tool returns results in `web_search` array
    if (Array.isArray(data.web_search) && data.web_search.length > 0) {
      return data.web_search.slice(0, numResults).map((r) => ({
        name: r.title || "",
        snippet: r.content || "",
        url: r.link || r.media || "",
      }));
    }

    // Otherwise, parse the model's text response for JSON
    const content = data.choices?.[0]?.message?.content || "";
    return parseSearchResultsFromText(content, query);
  } catch {
    return [];
  }
}

// Fallback: if the web_search tool isn't available, ask the model directly.
// Less accurate (no live data) but keeps the app functional.
async function fallbackSearch(query: string, numResults: number): Promise<SearchResult[]> {
  try {
    const content = await chatCompletion([
      {
        role: "user",
        content: `Based on your knowledge, what are the top ${numResults} most relevant results for: "${query}"? Format as JSON array: [{"name":"title","snippet":"description","url":"https://..."}]. Only return the JSON, no prose.`,
      },
    ]);
    return parseSearchResultsFromText(content, query);
  } catch {
    return [];
  }
}

function parseSearchResultsFromText(text: string, query: string): SearchResult[] {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 6).map((r: Record<string, string>) => ({
        name: r.name || r.title || "",
        snippet: r.snippet || r.content || "",
        url: r.url || r.link || "",
      }));
    }
  } catch {
    // not JSON — return empty
  }
  return [];
}
