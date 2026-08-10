import type { IPOGMPSnapshot, IPOSubscriptionSnapshot } from "@/types/ipo";

function hourKey(value: string) {
  return value.slice(0, 13);
}

export function dedupeGmpSnapshots(snapshots: IPOGMPSnapshot[] = []) {
  const seen = new Set<string>();
  const deduped: IPOGMPSnapshot[] = [];

  for (const snapshot of snapshots) {
    const key = [
      snapshot.ipo_id,
      snapshot.source ?? "unknown",
      hourKey(snapshot.captured_at),
      snapshot.gmp ?? "null",
      snapshot.gmp_percent ?? "null",
      snapshot.issue_price ?? "null",
      snapshot.estimated_listing_price ?? "null",
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(snapshot);
  }

  return deduped;
}

export function dedupeSubscriptionSnapshots(snapshots: IPOSubscriptionSnapshot[] = []) {
  const seen = new Set<string>();
  const deduped: IPOSubscriptionSnapshot[] = [];

  for (const snapshot of snapshots) {
    const key = [
      snapshot.ipo_id,
      snapshot.source ?? "unknown",
      hourKey(snapshot.captured_at),
      snapshot.qib_times ?? "null",
      snapshot.nii_times ?? "null",
      snapshot.retail_times ?? "null",
      snapshot.employee_times ?? "null",
      snapshot.shareholder_times ?? "null",
      snapshot.total_times ?? "null",
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(snapshot);
  }

  return deduped;
}

export function gmpSourceRange(snapshots: IPOGMPSnapshot[] = []) {
  const values = snapshots.map((snapshot) => snapshot.gmp).filter((value): value is number => value !== null && value !== undefined);
  if (values.length === 0) return null;

  return {
    max: Math.max(...values),
    min: Math.min(...values),
    varies: Math.max(...values) !== Math.min(...values),
  };
}
