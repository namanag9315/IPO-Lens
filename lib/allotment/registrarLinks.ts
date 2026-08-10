import type { AllotmentRegistrar, OfficialAllotmentLink } from "@/lib/allotment/types";

export const OFFICIAL_LINKS: Record<AllotmentRegistrar, OfficialAllotmentLink> = {
  MOCK: {
    label: "Open BSE status page",
    url: "https://www.bseindia.com/investors/appli_check",
    description: "Official BSE issue application status page.",
  },
  KFINTECH: {
    label: "Open KFintech IPO status",
    url: "https://ipostatus.kfintech.com/",
    description: "Official KFintech IPO allotment status page.",
  },
  MUFG_INTIME: {
    label: "Open MUFG Intime public issues",
    url: "https://in.mpms.mufg.com/Initial_Offer/public-issues.html",
    description: "Official MUFG Intime public issue application status page.",
  },
  BIGSHARE: {
    label: "Open Bigshare IPO allotment",
    url: "https://www.bigshareonline.com/ipo_allotment.html",
    description: "Official Bigshare Services IPO allotment status page.",
  },
  BSE: {
    label: "Open BSE status page",
    url: "https://www.bseindia.com/investors/appli_check",
    description: "Official BSE issue application status page.",
  },
  NSE: {
    label: "Open NSE bid verification",
    url: "https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids",
    description: "Official NSE IPO bid and allotment verification page.",
  },
};

export function registrarLabel(registrar: AllotmentRegistrar | null | undefined) {
  switch (registrar) {
    case "KFINTECH":
      return "KFintech";
    case "MUFG_INTIME":
      return "MUFG Intime";
    case "BIGSHARE":
      return "Bigshare";
    case "BSE":
      return "BSE";
    case "NSE":
      return "NSE";
    default:
      return "BSE";
  }
}

export function officialLinkFor(registrar: AllotmentRegistrar | null | undefined) {
  return OFFICIAL_LINKS[registrar ?? "BSE"];
}

export function officialFallbackLinks(registrar: AllotmentRegistrar | null | undefined): OfficialAllotmentLink[] {
  const primary = officialLinkFor(registrar);
  const links = [primary, OFFICIAL_LINKS.BSE, OFFICIAL_LINKS.NSE];
  const seen = new Set<string>();

  return links.filter((link) => {
    if (seen.has(link.url)) {
      return false;
    }

    seen.add(link.url);
    return true;
  });
}
