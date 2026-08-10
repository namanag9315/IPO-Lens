export type DataFreshnessLabel = "Fresh" | "Recent" | "Stale" | "Old";

export function getDataFreshness(capturedAt: string | null | undefined): DataFreshnessLabel {
  if (!capturedAt) {
    return "Old";
  }

  const timestamp = new Date(capturedAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Old";
  }

  const ageHours = (Date.now() - timestamp) / 3_600_000;

  if (ageHours < 2) {
    return "Fresh";
  }

  if (ageHours < 12) {
    return "Recent";
  }

  if (ageHours < 24) {
    return "Stale";
  }

  return "Old";
}

export function relativeUpdatedTime(capturedAt: string | null | undefined) {
  if (!capturedAt) {
    return "Updated time unavailable";
  }

  const timestamp = new Date(capturedAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Updated time unavailable";
  }

  const ageMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));

  if (ageMinutes < 1) {
    return "Updated just now";
  }

  if (ageMinutes < 60) {
    return `Updated ${ageMinutes} min ago`;
  }

  const ageHours = Math.round(ageMinutes / 60);

  if (ageHours < 24) {
    return `Updated ${ageHours}h ago`;
  }

  const ageDays = Math.round(ageHours / 24);

  return `Updated ${ageDays}d ago`;
}

export function isSnapshotStale(capturedAt: string | null | undefined, maxAgeHours = 1) {
  if (!capturedAt) {
    return true;
  }

  const timestamp = new Date(capturedAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > maxAgeHours * 3_600_000;
}
