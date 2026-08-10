import { officialLinkFor } from "@/lib/allotment/registrarLinks";
import type { AllotmentProvider, ProviderCheckInput } from "@/lib/allotment/providers/baseProvider";

export const kfintechProvider: AllotmentProvider = {
  name: "KFINTECH",
  isEnabled() {
    return process.env.ALLOTMENT_KFINTECH_ENABLED === "true";
  },
  async check(input: ProviderCheckInput) {
    const fallback = officialLinkFor("KFINTECH");

    return {
      allottedShares: null,
      applicationNumberMasked: null,
      checkedAt: new Date().toISOString(),
      fallbackAction: { label: fallback.label, url: fallback.url },
      investorName: null,
      ipoName: input.ipo.name,
      message: "Automatic check is not available for KFintech yet. Check directly on the official registrar, BSE, or NSE website.",
      panMasked: null,
      source: "KFintech",
      sourceUrl: fallback.url,
      status: "UNAVAILABLE",
    };
  },
};
