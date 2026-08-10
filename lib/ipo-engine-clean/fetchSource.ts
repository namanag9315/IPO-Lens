import { detectIPOPageContent } from "@/lib/ipo-engine-clean/detectSourceContent";

export interface FetchSourceResult {
  blocked: boolean;
  durationMs: number;
  error: string | null;
  html: string | null;
  ok: boolean;
  status: number | null;
  text: string | null;
}

const USER_AGENTS = [
  "IPO Lens Research Bot/1.0 (+https://ipo-lens.local; educational public-source research)",
  "Mozilla/5.0 IPO Lens Research/1.0",
];

function detectBlocked(text: string, status: number | null) {
  if (status && [401, 403, 429].includes(status)) return true;
  return detectIPOPageContent({ provider: "GENERIC", text }).isCaptchaOrBlocked;
}

export async function fetchSource(url: string, options: { delayMs?: number; retries?: number; timeoutMs?: number } = {}): Promise<FetchSourceResult> {
  const started = Date.now();
  const retries = options.retries ?? 1;

  if (options.delayMs) {
    await new Promise((resolve) => setTimeout(resolve, options.delayMs));
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
    try {
      const response = await fetch(url, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          "user-agent": USER_AGENTS[attempt % USER_AGENTS.length],
        },
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") ?? "";
      const text = await response.text();
      const blocked = detectBlocked(text, response.status);
      const html = /html|xml|text/i.test(contentType) ? text : null;
      clearTimeout(timeout);
      return {
        blocked,
        durationMs: Date.now() - started,
        error: response.ok ? null : `HTTP ${response.status}`,
        html,
        ok: response.ok && !blocked && Boolean(html),
        status: response.status,
        text,
      };
    } catch (error) {
      clearTimeout(timeout);
      if (attempt >= retries) {
        return {
          blocked: false,
          durationMs: Date.now() - started,
          error: error instanceof Error ? error.message : "Fetch failed.",
          html: null,
          ok: false,
          status: null,
          text: null,
        };
      }
    }
  }

  return { blocked: false, durationMs: Date.now() - started, error: "Fetch failed.", html: null, ok: false, status: null, text: null };
}
