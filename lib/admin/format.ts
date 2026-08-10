import { formatDistanceToNowStrict } from "date-fns";

export function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "NA";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: unknown) {
  if (!value || typeof value !== "string") return "NA";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function timeAgo(value: unknown) {
  if (!value || typeof value !== "string") return "Never";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Never";
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function formatMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NA";
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatCr(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NA";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}

export function formatTimes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NA";
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}x`;
}

export function formatPct(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "NA";
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

export function asString(value: unknown, fallback = "NA") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
