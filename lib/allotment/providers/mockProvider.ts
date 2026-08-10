import { maskApplicationNumber, maskPAN } from "@/lib/allotment/mask";
import type { AllotmentProvider, ProviderCheckInput } from "@/lib/allotment/providers/baseProvider";
import type { AllotmentStatus } from "@/lib/allotment/types";

function lastDigit(value: string) {
  const match = value.match(/\d(?=\D*$)/);

  return match ? Number(match[0]) : 0;
}

function deterministicStatus(value: string): AllotmentStatus {
  return lastDigit(value) % 2 === 1 ? "ALLOTTED" : "NOT_ALLOTTED";
}

export const mockProvider: AllotmentProvider = {
  name: "MOCK",
  isEnabled() {
    return true;
  },
  async check(input: ProviderCheckInput) {
    const status = deterministicStatus(input.value);
    const isAllotted = status === "ALLOTTED";

    return {
      allottedShares: isAllotted ? 1 : 0,
      applicationNumberMasked: input.checkType === "APPLICATION_NO" ? maskApplicationNumber(input.value) : null,
      checkedAt: new Date().toISOString(),
      fallbackAction: null,
      investorName: null,
      ipoName: input.ipo.name,
      message: isAllotted
        ? "Synthetic local allotment check returned an allotted status for testing."
        : "Synthetic local allotment check returned a not allotted status for testing.",
      panMasked: input.checkType === "PAN" ? maskPAN(input.value) : null,
      source: "IPO Lens synthetic provider",
      sourceUrl: null,
      status,
    };
  },
};
