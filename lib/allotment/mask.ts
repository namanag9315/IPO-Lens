import type { AllotmentCheckType } from "@/lib/allotment/types";

export function maskPAN(value: string) {
  const normalized = value.trim().toUpperCase();

  if (normalized.length !== 10) {
    return "**********";
  }

  return `${normalized.slice(0, 5)}****${normalized.slice(-1)}`;
}

export function maskApplicationNumber(value: string) {
  const normalized = value.trim();
  const last4 = normalized.slice(-4);

  return last4 ? `****${last4}` : "****";
}

export function maskDematId(value: string) {
  const normalized = value.trim();
  const last4 = normalized.slice(-4);

  return last4 ? `****${last4}` : "****";
}

export function maskIdentifier(checkType: AllotmentCheckType, value: string) {
  if (checkType === "PAN") {
    return maskPAN(value);
  }

  if (checkType === "APPLICATION_NO") {
    return maskApplicationNumber(value);
  }

  return maskDematId(value);
}

export function panLast4(value: string) {
  return value.trim().toUpperCase().slice(5, 9);
}
