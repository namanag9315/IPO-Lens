import { officialLinkFor } from "@/lib/allotment/registrarLinks";
import type { AllotmentProvider, ProviderCheckInput } from "@/lib/allotment/providers/baseProvider";

export const nseProvider: AllotmentProvider = {
  name: "NSE",
  isEnabled() {
    return process.env.ALLOTMENT_NSE_ENABLED === "true";
  },
  async check(input: ProviderCheckInput) {
    const fallback = officialLinkFor("NSE");

    return {
      allottedShares: null,
      applicationNumberMasked: null,
      checkedAt: new Date().toISOString(),
      fallbackAction: { label: fallback.label, url: fallback.url },
      investorName: null,
      ipoName: input.ipo.name,
      message: "Automatic NSE check is not available yet. Use the official NSE IPO bid and allotment verification page.",
      panMasked: null,
      source: "NSE",
      sourceUrl: fallback.url,
      status: "UNAVAILABLE",
    };
  },
};
