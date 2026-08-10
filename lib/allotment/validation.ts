import type { AllotmentCheckRequest, AllotmentCheckType, AllotmentRegistrar } from "@/lib/allotment/types";

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const REGISTRARS: AllotmentRegistrar[] = ["MOCK", "KFINTECH", "MUFG_INTIME", "BIGSHARE", "BSE", "NSE"];
const CHECK_TYPES: AllotmentCheckType[] = ["PAN", "APPLICATION_NO", "DEMAT"];

export function normalizePAN(value: string) {
  return value.trim().toUpperCase();
}

export function isValidPAN(value: string) {
  return PAN_PATTERN.test(normalizePAN(value));
}

export function normalizeRegistrar(value: unknown): AllotmentRegistrar | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_") as AllotmentRegistrar;

  return REGISTRARS.includes(normalized) ? normalized : null;
}

export function normalizeCheckType(value: unknown): AllotmentCheckType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_") as AllotmentCheckType;

  return CHECK_TYPES.includes(normalized) ? normalized : null;
}

export function parseRegistrarName(value: string | null | undefined): AllotmentRegistrar | null {
  const normalized = (value ?? "").toUpperCase();

  if (normalized.includes("KFIN")) {
    return "KFINTECH";
  }

  if (normalized.includes("MUFG") || normalized.includes("LINK INTIME") || normalized.includes("INTIME")) {
    return "MUFG_INTIME";
  }

  if (normalized.includes("BIGSHARE") || normalized.includes("BIG SHARE")) {
    return "BIGSHARE";
  }

  if (normalized.includes("BSE")) {
    return "BSE";
  }

  if (normalized.includes("NSE")) {
    return "NSE";
  }

  if (normalized.includes("MOCK")) {
    return "MOCK";
  }

  return null;
}

export function validateAllotmentRequest(payload: unknown): { request: AllotmentCheckRequest | null; error: string | null } {
  const body = (payload ?? {}) as Partial<AllotmentCheckRequest>;
  const registrar = normalizeRegistrar(body.registrar);
  const checkType = normalizeCheckType(body.checkType);
  const value = typeof body.value === "string" ? body.value.trim() : "";
  const ipoId = typeof body.ipoId === "string" ? body.ipoId.trim() : "";

  if (!ipoId) {
    return { request: null, error: "IPO is required." };
  }

  if (!registrar) {
    return { request: null, error: "Select a valid allotment source." };
  }

  if (!checkType) {
    return { request: null, error: "Select a valid check method." };
  }

  if (!value) {
    return { request: null, error: "Enter an identifier for this allotment check." };
  }

  if (checkType === "PAN" && !isValidPAN(value)) {
    return { request: null, error: "Enter a valid PAN." };
  }

  if (checkType !== "PAN" && value.length < 4) {
    return { request: null, error: "Enter at least 4 characters." };
  }

  return {
    error: null,
    request: {
      ipoId,
      registrar,
      checkType,
      value: checkType === "PAN" ? normalizePAN(value) : value,
    },
  };
}
