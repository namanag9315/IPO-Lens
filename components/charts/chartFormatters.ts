export const CHART_COLORS = {
  amber: "#D97706",
  blue: "#2563EB",
  green: "#16A34A",
  navy: "#07122B",
  red: "#DC2626",
  slate: "#64748B",
  line: "#E5E7EB",
};

export function formatCrore(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `₹${Number.isFinite(number) ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0"}Cr`;
}

export function formatRupee(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `₹${Number.isFinite(number) ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0"}`;
}

export function formatPercent(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number.toFixed(1) : "0.0"}%`;
}

export function formatTimes(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number.toFixed(1) : "0.0"}x`;
}

export function shortDateLabel(value: string | null | undefined) {
  if (!value) return "NA";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value));
}
