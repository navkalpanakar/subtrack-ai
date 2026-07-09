import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseEmailForSubscriptions, type ParsedSubscription } from "@/lib/ai";
import { logoForProvider } from "@/lib/logo";

// Real Gmail inbox scan — fetches actual billing emails via Gmail API
// and parses them with AI to detect subscriptions.
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the NextAuth session (which has the Google access token)
  const session = await getServerSession(authOptions);
  const accessToken = (session?.user as { accessToken?: string })?.accessToken;

  if (!accessToken) {
    return NextResponse.json({
      connected: false,
      error: "No Gmail access. Please sign in with Google to scan your inbox.",
      detected: [],
    });
  }

  try {
    // Step 1: Search Gmail for subscription billing emails
    const searchQuery = "subject:(receipt OR invoice OR subscription OR billing OR payment OR renewal OR order) newer_than:6m";
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(searchQuery)}&maxResults=20`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("[gmail] Search failed:", searchRes.status, errText);
      return NextResponse.json({
        connected: false,
        error: `Gmail API error: ${searchRes.status}`,
        detected: [],
      });
    }

    const searchData = await searchRes.json();
    const messages = searchData.messages || [];

    if (messages.length === 0) {
      return NextResponse.json({
        connected: true,
        scanSource: "gmail-real",
        detected: [],
        message: "No billing emails found in the last 6 months.",
      });
    }

    // Step 2: Fetch the content of each email (batch — max 10 for speed)
    const emailContents: string[] = [];
    const messagesToFetch = messages.slice(0, 10);

    for (const msg of messagesToFetch) {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full&metadataHeaders=Subject&metadataHeaders=From`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!msgRes.ok) continue;

        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];
        const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value || "";
        const from = headers.find((h: { name: string }) => h.name === "From")?.value || "";

        // Extract text content from the email
        let textContent = "";
        if (msgData.payload?.body?.data) {
          textContent = Buffer.from(msgData.payload.body.data, "base64").toString("utf-8");
        } else if (msgData.payload?.parts) {
          for (const part of msgData.payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              textContent += Buffer.from(part.body.data, "base64").toString("utf-8");
            }
          }
        }

        // Combine subject + from + first 500 chars of body
        const emailText = `Subject: ${subject}\nFrom: ${from}\n${textContent.slice(0, 500)}`;
        emailContents.push(emailText);
      } catch {
        // Skip failed messages
      }
    }

    if (emailContents.length === 0) {
      return NextResponse.json({
        connected: true,
        scanSource: "gmail-real",
        detected: [],
        message: "Could not read email contents.",
      });
    }

    // Step 3: Parse all email contents with AI to find subscriptions
    const allParsed: ParsedSubscription[] = [];
    for (const content of emailContents) {
      try {
        const parsed = await parseEmailForSubscriptions(content);
        allParsed.push(...parsed);
      } catch {
        // Skip failed parses
      }
    }

    // Step 4: Deduplicate by provider name
    const seen = new Set<string>();
    const unique = allParsed.filter((s) => {
      const key = (s.name || "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Step 5: Format for the frontend
    const today = new Date();
    const inDays = (d: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      return date.toISOString().slice(0, 10);
    };

    // Get user's currency
    const user = await db.user.findUnique({ where: { id: userId }, select: { currency: true } });
    const currency = user?.currency || "USD";

    const detected = unique.map((s) => ({
      name: s.name,
      provider: s.provider || s.name,
      category: s.category || "Other",
      amount: s.amount,
      currency: s.currency || currency,
      billingCycle: s.billingCycle || "monthly",
      nextBillingDate: s.nextBillingDate || inDays(7),
      notes: s.notes || "Detected from Gmail",
      logo: logoForProvider(s.provider || s.name),
      color: null,
      cancelUrl: null,
    }));

    // Link the google provider
    await db.linkedAccount.upsert({
      where: { userId_provider: { userId, provider: "google" } },
      update: {},
      create: { userId, provider: "google", identifier: session?.user?.email || "" },
    });

    return NextResponse.json({
      connected: true,
      scanSource: "gmail-real",
      detected,
      emailsScanned: emailContents.length,
    });
  } catch (e) {
    console.error("[gmail] Scan error:", e);
    return NextResponse.json({
      connected: false,
      error: "Gmail scan failed. Please try again.",
      detected: [],
    });
  }
}
