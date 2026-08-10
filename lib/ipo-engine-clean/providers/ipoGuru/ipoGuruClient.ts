/**
 * ipoGuruClient.ts — Server-side only. Never import from client components.
 *
 * Wraps the IPO Guru REST API (https://www.ipoguru.in/api/v1).
 * Known endpoints: GET /ipos (only one that exists)
 * Auth: X-API-KEY header
 * Rate: 15 req/min, 300 req/day
 */

export interface IPOGuruClientResult {
  ok: boolean;
  status: number | null;
  data: unknown | null;
  error: string | null;
  durationMs: number;
}

function getConfig() {
  const key = process.env.IPO_GURU_API_KEY ?? "";
  const baseUrl = process.env.IPO_GURU_BASE_URL ?? "https://www.ipoguru.in/api/v1";
  const enabledEnv = process.env.IPO_GURU_ENABLED;
  const enabled = enabledEnv !== "false";
  return { key, baseUrl, enabled };
}

export function isIPOGuruConfigured(): boolean {
  const { key } = getConfig();
  return key.length > 0;
}

export function isIPOGuruEnabled(): boolean {
  const { enabled } = getConfig();
  return enabled;
}

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404, 429]);

export async function ipoGuruFetch(
  path: string,
  options?: { timeoutMs?: number },
): Promise<IPOGuruClientResult> {
  const { key, baseUrl, enabled } = getConfig();

  if (!key) {
    return { ok: false, status: null, data: null, error: "provider_not_configured", durationMs: 0 };
  }

  if (!enabled) {
    return { ok: false, status: null, data: null, error: "provider_disabled", durationMs: 0 };
  }

  const keyPreview = `****${key.slice(-4)}`;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const url = `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const MAX_ATTEMPTS = 3; // 1 initial + 2 retries
  let lastError: string | null = null;
  let lastStatus: number | null = null;
  const start = Date.now();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-API-KEY": key,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timer);
      lastStatus = res.status;

      if (res.status === 401) {
        const durationMs = Date.now() - start;
        console.warn(`[IPOGuru] 401 Unauthorized (key preview: ${keyPreview})`);
        return { ok: false, status: 401, data: null, error: "invalid_api_key", durationMs };
      }

      if (res.status === 429) {
        const durationMs = Date.now() - start;
        console.warn(`[IPOGuru] 429 Rate limit exceeded (key preview: ${keyPreview})`);
        return { ok: false, status: 429, data: null, error: "rate_limit_exceeded", durationMs };
      }

      if (NON_RETRYABLE_STATUS.has(res.status)) {
        const durationMs = Date.now() - start;
        lastError = `http_${res.status}`;
        return { ok: false, status: res.status, data: null, error: lastError, durationMs };
      }

      if (!res.ok) {
        lastError = `http_${res.status}`;
        // If retryable, loop again
        if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }
        const durationMs = Date.now() - start;
        return { ok: false, status: res.status, data: null, error: lastError, durationMs };
      }

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        const durationMs = Date.now() - start;
        return { ok: false, status: res.status, data: null, error: "invalid_json_response", durationMs };
      }

      const durationMs = Date.now() - start;
      return { ok: true, status: res.status, data, error: null, durationMs };
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === "AbortError";
      lastError = isAbort ? "request_timeout" : (err instanceof Error ? err.message : "network_error");

      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
    }
  }

  const durationMs = Date.now() - start;
  return { ok: false, status: lastStatus, data: null, error: lastError ?? "unknown_error", durationMs };
}
