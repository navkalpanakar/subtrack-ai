import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import ZAI from "z-ai-web-dev-sdk";

// Transcribe audio (base64) to text using ASR. Used by the voice-input
// mic button in the Quick Add sheet.
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { audio } = await req.json();
  if (!audio || typeof audio !== "string")
    return NextResponse.json({ error: "audio (base64) required" }, { status: 400 });

  // Accept either a raw base64 string or a data URL.
  const base64 = audio.startsWith("data:")
    ? audio.split(",")[1] || ""
    : audio;

  try {
    const zai = await ZAI.create();
    const response = await zai.audio.asr.create({ file_base64: base64 });
    const text = (response as { text?: string }).text || "";
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transcription failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
