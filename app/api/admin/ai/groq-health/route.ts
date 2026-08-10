/**
 * /app/api/admin/ai/groq-health/route.ts
 * GET handler: checks Groq API connectivity and key configuration.
 */

import { NextResponse } from "next/server";
import { callGroq } from "@/lib/ai/callGroq";

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      ok: false,
      error: "GROQ_API_KEY not set",
      model: "",
      sample: null,
    });
  }

  const result = await callGroq({
    messages: [
      {
        role: "user",
        content: "Return only OK.",
      },
    ],
    temperature: 0,
    maxTokens: 10,
  });

  return NextResponse.json({
    configured: true,
    model: result.model,
    ok: result.ok,
    status: result.status,
    error: result.error,
    sample: result.text,
  });
}
