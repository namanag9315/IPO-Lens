import { Registrar } from "./types";

export interface RegistrarLink {
  label: string;
  url: string;
  description: string;
}

export function getFallbackLinks(registrar: Registrar | null, exchange: string | null): RegistrarLink[] {
  const links: RegistrarLink[] = [];

  if (registrar === "KFINTECH") {
    links.push({
      label: "KFintech Allotment Status",
      url: "https://kosmic.kfintech.com/ipostatus/",
      description: "Official KFintech allotment checking portal",
    });
  } else if (registrar === "MUFG_INTIME") {
    links.push({
      label: "Link Intime Allotment Status",
      url: "https://linkintime.co.in/initial_offer/public-issues.html",
      description: "Official Link Intime allotment checking portal",
    });
  } else if (registrar === "BIGSHARE") {
    links.push({
      label: "Bigshare Allotment Status",
      url: "https://ipo.bigshareonline.com/IPO_Status.html",
      description: "Official Bigshare allotment checking portal",
    });
  }

  const exUpper = exchange?.toUpperCase() || "";
  
  if (exUpper.includes("BSE") || exUpper === "BSE SME" || exUpper === "NSE/BSE") {
    links.push({
      label: "BSE India Application Status",
      url: "https://www.bseindia.com/investors/appli_check.aspx",
      description: "Check status using application number on BSE",
    });
  }
  
  if (exUpper.includes("NSE") || exUpper === "NSE SME" || exUpper === "NSE/BSE") {
    links.push({
      label: "NSE India Bid Verification",
      url: "https://www.nseindia.com/products/dynaContent/equities/ipos/ipo_login.jsp",
      description: "Verify your IPO bid directly with NSE",
    });
  }

  return links;
}
