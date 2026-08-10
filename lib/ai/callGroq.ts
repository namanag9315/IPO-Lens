/**
 * callGroq.ts — server-side only Groq API caller.
 * Never throws. Always returns a typed result object.
 */

export interface GroqCallResult {
  ok: boolean;
  text: string | null;
  model: string;
  error: string | null;
  status?: number;
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqCallOptions {
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 20_000;

function mapErrorStatus(status: number): string {
  if (status === 401) return "GROQ_API_KEY is invalid or expired";
  if (status === 400) return "Invalid request sent to Groq API";
  if (status === 429) return "Groq rate limit reached — try again later";
  if (status >= 500 && status < 600) return "Groq service unavailable";
  return `Groq returned HTTP ${status}`;
}

export async function callGroq(options: GroqCallOptions): Promise<GroqCallResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  if (!apiKey) {
    return {
      ok: false,
      text: null,
      model: "",
      error: "GROQ_API_KEY not configured",
      status: undefined,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        ok: false,
        text: null,
        model,
        error: mapErrorStatus(response.status),
        status: response.status,
      };
    }

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = json?.choices?.[0]?.message?.content ?? null;

    if (!text) {
      return {
        ok: false,
        text: null,
        model,
        error: "Groq returned an empty response",
        status: response.status,
      };
    }

    return {
      ok: true,
      text,
      model,
      error: null,
      status: response.status,
    };
  } catch (err: unknown) {
    clearTimeout(timeout);

    const isAbort =
      err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));

    return {
      ok: false,
      text: null,
      model,
      error: isAbort ? "Groq request timed out after 20 seconds" : `Groq fetch error: ${err instanceof Error ? err.message : String(err)}`,
      status: undefined,
    };
  }
}
