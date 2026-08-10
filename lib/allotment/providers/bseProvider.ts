import { officialLinkFor } from "@/lib/allotment/registrarLinks";
import type { AllotmentProvider, ProviderCheckInput } from "@/lib/allotment/providers/baseProvider";

export const bseProvider: AllotmentProvider = {
  name: "BSE",
  isEnabled() {
    return process.env.ALLOTMENT_BSE_ENABLED === "true";
  },
  async check(input: ProviderCheckInput) {
    const fallback = officialLinkFor("BSE");

    return {
      allottedShares: null,
      applicationNumberMasked: null,
      checkedAt: new Date().toISOString(),
      fallbackAction: { label: fallback.label, url: fallback.url },
      investorName: null,
      ipoName: input.ipo.name,
      message: "Automatic BSE check is not available yet. Use the official BSE application status page.",
      panMasked: null,
      source: "BSE",
      sourceUrl: fallback.url,
      status: "UNAVAILABLE",
    };
  },
};
