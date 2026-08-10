import { matchIPONameClean, scoreIPONameCandidate, type CleanIPOReference } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { parseChittorgarhIPOList } from "@/lib/ipo-engine-clean/providers/chittorgarhProvider";
import { CHITTORGARH_LIST_URL, fetchConfiguredSource } from "@/lib/ipo-engine-clean/sync/common";
import { fetchSource } from "@/lib/ipo-engine-clean/fetchSource";
import { saveSourceUrl } from "@/lib/ipo-engine-clean/source-discovery/resolveSourceUrlForIPO";
import { verifySourceIdentity } from "@/lib/ipo-engine-clean/verifySourceIdentity";

let cachedList: { expiresAt: number; records: ReturnType<typeof parseChittorgarhIPOList> } | null = null;

async function loadListRecords() {
  if (cachedList && cachedList.expiresAt > Date.now()) return cachedList.records;
  const fetched = await fetchConfiguredSource("CHITTORGARH", "ipo_list", CHITTORGARH_LIST_URL);
  const records = fetched.ok && fetched.html ? parseChittorgarhIPOList(fetched.html) : [];
  cachedList = { expiresAt: Date.now() + 5 * 60_000, records };
  return records;
}

export async function discoverChittorgarhUrl(
  ipo: CleanIPOReference,
): Promise<{ confidence: number; method: string; url: string } | null> {
  const records = await loadListRecords();
  const distinct = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const key = normalizeIPONameClean(record.rawName);
    if (key && record.sourceUrl && !distinct.has(key)) distinct.set(key, record);
  }

  const ranked = Array.from(distinct.values())
    .map((record) => {
      const payload = record.payload as Record<string, unknown>;
      const match = matchIPONameClean({
        closeDate: typeof payload.closeDate === "string" ? payload.closeDate : null,
        existingIpos: [ipo],
        issueSizeCr: typeof payload.issueSizeCr === "number" ? payload.issueSizeCr : null,
        openDate: typeof payload.openDate === "string" ? payload.openDate : null,
        priceBandHigh: typeof payload.priceBandHigh === "number" ? payload.priceBandHigh : null,
        priceBandLow: typeof payload.priceBandLow === "number" ? payload.priceBandLow : null,
        provider: "CHITTORGARH",
        rawName: record.rawName,
      });
      return {
        confidence: match.confidence,
        nameScore: scoreIPONameCandidate(ipo.name, record.rawName).score,
        record,
      };
    })
    .sort((left, right) => right.confidence - left.confidence || right.nameScore - left.nameScore);

  const best = ranked[0];
  const second = ranked[1];
  const margin = second ? best.confidence - second.confidence : best?.confidence ?? 0;
  if (!best?.record.sourceUrl || best.confidence < 82 || margin < 6) return null;

  const fetched = await fetchSource(best.record.sourceUrl, { retries: 1, timeoutMs: 14_000 });
  if (!fetched.ok || !fetched.html) {
    await saveSourceUrl({
      discoveryMethod: "list_row_verified",
      failureReason: fetched.error ?? `HTTP ${fetched.status}`,
      ipoId: ipo.id,
      matchConfidence: best.confidence,
      provider: "CHITTORGARH",
      sourceType: "detail",
      sourceUrl: best.record.sourceUrl,
      status: fetched.blocked ? "blocked" : "failed",
    });
    return null;
  }

  const identity = verifySourceIdentity({ html: fetched.html, ipoName: ipo.name, sourceUrl: best.record.sourceUrl });
  const confidence = Math.min(best.confidence, identity.confidence);
  await saveSourceUrl({
    discoveryMethod: "list_row_verified",
    failureReason: identity.accepted ? null : identity.reason,
    ipoId: ipo.id,
    matchConfidence: confidence,
    provider: "CHITTORGARH",
    sourceType: "detail",
    sourceUrl: best.record.sourceUrl,
    status: identity.accepted ? "verified" : "needs_review",
  });

  return identity.accepted ? { confidence, method: "list_row_verified", url: best.record.sourceUrl } : null;
}
