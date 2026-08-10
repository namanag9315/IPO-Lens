import { ipoGuruFetch, isIPOGuruConfigured, isIPOGuruEnabled } from "./ipoGuruClient";
import { extractIPOGuruEntries } from "./ipoGuruMapper";

export interface IPOGuruHealthResult {
  configured: boolean;
  enabled: boolean;
  ok: boolean;
  status: number | null;
  error: string | null;
  keyPreview: string | null; // "****XXXX" — last 4 chars only
  sampleShape?: Record<string, unknown> | null;
  durationMs: number;
}

export async function checkIPOGuruHealth(): Promise<IPOGuruHealthResult> {
  const configured = isIPOGuruConfigured();
  const enabled = isIPOGuruEnabled();

  const key = process.env.IPO_GURU_API_KEY ?? "";
  const keyPreview = key.length >= 4 ? `****${key.slice(-4)}` : "****";

  if (!configured) {
    return {
      configured: false,
      enabled,
      ok: false,
      status: null,
      error: "provider_not_configured",
      keyPreview: null,
      sampleShape: null,
      durationMs: 0,
    };
  }

  const result = await ipoGuruFetch("/ipos");

  let sampleShape: Record<string, unknown> | null = null;
  if (result.ok && result.data) {
    const entries = extractIPOGuruEntries(result.data);
    if (entries.length > 0 && entries[0] && typeof entries[0] === "object") {
      sampleShape = Object.fromEntries(Object.keys(entries[0]).map((k) => [k, typeof entries[0][k]])) as Record<string, unknown>;
    } else if (typeof result.data === "object" && result.data !== null && !Array.isArray(result.data)) {
      sampleShape = Object.fromEntries(Object.keys(result.data as object).map((k) => [k, typeof (result.data as Record<string, unknown>)[k]])) as Record<string, unknown>;
    }
  }

  return {
    configured,
    enabled,
    ok: result.ok,
    status: result.status,
    error: result.error,
    keyPreview,
    sampleShape,
    durationMs: result.durationMs,
  };
}
