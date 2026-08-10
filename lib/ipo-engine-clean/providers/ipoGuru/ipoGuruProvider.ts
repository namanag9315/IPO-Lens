import { ipoGuruFetch } from "./ipoGuruClient";
import { extractIPOGuruEntries, mapIPOGuruEntry } from "./ipoGuruMapper";
import type { IPOGuruFetchListResult } from "./ipoGuruTypes";
import type { GMPRecord, SubscriptionRecord } from "@/lib/ipo-engine-clean/types";

/** Fetch all IPO entries from the /ipos endpoint */
export async function fetchIPOListFromIPOGuru(): Promise<IPOGuruFetchListResult> {
  const result = await ipoGuruFetch("/ipos");

  if (!result.ok) {
    return {
      ok: false,
      entries: [],
      raw: result.data,
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  const entries = extractIPOGuruEntries(result.data);
  return {
    ok: true,
    entries,
    raw: result.data,
    error: null,
    durationMs: result.durationMs,
  };
}

/** Fetch GMP records from IPO Guru (GMP is embedded in the /ipos list) */
export async function fetchIPOGMPFromIPOGuru(): Promise<{
  ok: boolean;
  records: GMPRecord[];
  error: string | null;
  durationMs: number;
}> {
  const result = await ipoGuruFetch("/ipos");

  if (!result.ok) {
    return { ok: false, records: [], error: result.error, durationMs: result.durationMs };
  }

  const entries = extractIPOGuruEntries(result.data);
  const records: GMPRecord[] = [];

  for (const entry of entries) {
    const mapped = mapIPOGuruEntry(entry);
    if (!mapped?.gmpRecord) continue;
    if (mapped.gmpRecord.gmpValue === null || !Number.isFinite(mapped.gmpRecord.gmpValue)) continue;
    records.push(mapped.gmpRecord);
  }

  return { ok: true, records, error: null, durationMs: result.durationMs };
}

/** Fetch subscription records from IPO Guru (subscription data is embedded in the /ipos list) */
export async function fetchIPOSubscriptionFromIPOGuru(): Promise<{
  ok: boolean;
  records: SubscriptionRecord[];
  error: string | null;
  durationMs: number;
}> {
  const result = await ipoGuruFetch("/ipos");

  if (!result.ok) {
    return { ok: false, records: [], error: result.error, durationMs: result.durationMs };
  }

  const entries = extractIPOGuruEntries(result.data);
  const records: SubscriptionRecord[] = [];

  for (const entry of entries) {
    const mapped = mapIPOGuruEntry(entry);
    if (!mapped?.subscriptionRecord) continue;
    if (mapped.subscriptionRecord.totalX === null || mapped.subscriptionRecord.totalX <= 0) continue;
    records.push(mapped.subscriptionRecord);
  }

  return { ok: true, records, error: null, durationMs: result.durationMs };
}
