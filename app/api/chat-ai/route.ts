import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { chatAboutIPO } from "@/lib/groq";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { userMessage, chatHistory, ipoContext } = body;

    if (!userMessage) {
      return NextResponse.json({ error: "userMessage is required." }, { status: 400 });
    }
    if (!ipoContext) {
      return NextResponse.json({ error: "ipoContext is required." }, { status: 400 });
    }

    const reply = await chatAboutIPO(userMessage, chatHistory || [], ipoContext);
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error in chat-ai route:", error.message);
    return NextResponse.json({ error: error.message || "Failed to process chat query." }, { status: 500 });
  }
}
