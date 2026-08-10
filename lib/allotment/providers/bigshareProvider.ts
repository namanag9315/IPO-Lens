import { officialLinkFor } from "@/lib/allotment/registrarLinks";
import type { AllotmentProvider, ProviderCheckInput } from "@/lib/allotment/providers/baseProvider";

export const bigshareProvider: AllotmentProvider = {
  name: "BIGSHARE",
  isEnabled() {
    return process.env.ALLOTMENT_BIGSHARE_ENABLED === "true";
  },
  async check(input: ProviderCheckInput) {
    const fallback = officialLinkFor("BIGSHARE");

    return {
      allottedShares: null,
      applicationNumberMasked: null,
      checkedAt: new Date().toISOString(),
      fallbackAction: { label: fallback.label, url: fallback.url },
      investorName: null,
      ipoName: input.ipo.name,
      message: "Automatic check is not available for Bigshare yet. Check directly on the official registrar, BSE, or NSE website.",
      panMasked: null,
      source: "Bigshare",
      sourceUrl: fallback.url,
      status: "UNAVAILABLE",
    };
  },
};
