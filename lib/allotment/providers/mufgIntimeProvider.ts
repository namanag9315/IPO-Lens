import { officialLinkFor } from "@/lib/allotment/registrarLinks";
import type { AllotmentProvider, ProviderCheckInput } from "@/lib/allotment/providers/baseProvider";

export const mufgIntimeProvider: AllotmentProvider = {
  name: "MUFG_INTIME",
  isEnabled() {
    return process.env.ALLOTMENT_MUFG_INTIME_ENABLED === "true";
  },
  async check(input: ProviderCheckInput) {
    const fallback = officialLinkFor("MUFG_INTIME");

    return {
      allottedShares: null,
      applicationNumberMasked: null,
      checkedAt: new Date().toISOString(),
      fallbackAction: { label: fallback.label, url: fallback.url },
      investorName: null,
      ipoName: input.ipo.name,
      message: "Automatic check is not available for MUFG Intime yet. Check directly on the official registrar, BSE, or NSE website.",
      panMasked: null,
      source: "MUFG Intime",
      sourceUrl: fallback.url,
      status: "UNAVAILABLE",
    };
  },
};
