import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";

export type IPOPageContentDetection = {
  confidence: "high" | "medium" | "low";
  isCaptchaOrBlocked: boolean;
  isInterstitialOnly: boolean;
  isValidIPOPage: boolean;
  matchedMarkers: string[];
  missingMarkers: string[];
  reason: string;
};

type DetectInput = {
  html?: string | null;
  ipoName?: string | null;
  provider: string;
  text?: string | null;
};

type Marker = {
  label: string;
  pattern: RegExp;
};

const CHITTORGARH_VALID_MARKERS: Marker[] = [
  { label: "IPO Details", pattern: /\bipo details\b/i },
  { label: "IPO Timetable", pattern: /\bipo timetable\b/i },
  { label: "Issue Reservation", pattern: /\bissue reservation\b/i },
  { label: "IPO Lot Size", pattern: /\bipo lot size\b|\blot size\b/i },
  { label: "About", pattern: /\babout(?: the)? company\b|\babout\b/i },
  { label: "Company Financials", pattern: /\bcompany financials\b|\bfinancial information\b/i },
  { label: "Key Performance Indicator", pattern: /\bkey performance indicator\b|\bkpi\b/i },
  { label: "IPO Subscription Status", pattern: /\bipo subscription status\b|\bsubscription status\b/i },
  { label: "IPO Registrar", pattern: /\bipo registrar\b|\bregistrar\b/i },
  { label: "IPO Lead Manager", pattern: /\bipo lead manager\b|\blead manager\b|\bmerchant banker\b|\bbrlm\b/i },
];

const FINOLOGY_VALID_MARKERS: Marker[] = [
  { label: "IPO Details", pattern: /\bipo details\b/i },
  { label: "Price Band", pattern: /\bprice band\b/i },
  { label: "Issue Size", pattern: /\bissue size\b/i },
  { label: "Listing Date", pattern: /\blisting date\b/i },
  { label: "Company Financials", pattern: /\bcompany financials\b/i },
  { label: "Profit & Loss", pattern: /\bprofit\s*&?\s*loss\b/i },
  { label: "Balance Sheet", pattern: /\bbalance sheet\b/i },
];

const IPOPLATFORM_VALID_MARKERS: Marker[] = [
  { label: "IPO Details", pattern: /\bipo details?\b|\bipo info\b|\bipo key highlights\b/i },
  { label: "Financials", pattern: /\bfinancials?\b|\bfinancial review\b|\bfinancial performance\b/i },
  { label: "Peer Comparison", pattern: /\bpeer comparison\b|\bpeer companies\b|\baverage sector pe\b/i },
  { label: "Subscription", pattern: /\bsubscription\b|\bsubscribed\b/i },
  { label: "Review", pattern: /\breview\b|\bdetailed review\b/i },
  { label: "Object of Issue", pattern: /\bobject(?:s)? of (?:the )?issue\b|\bipo objectives\b/i },
  { label: "Lead Manager", pattern: /\blead manager\b|\bmerchant banker\b|\bbrlm\b/i },
  { label: "Registrar", pattern: /\bregistrar\b|\brta\b/i },
  { label: "Market Maker", pattern: /\bmarket maker\b/i },
  { label: "RHP", pattern: /\brhp\b|\bred herring prospectus\b/i },
  { label: "DRHP", pattern: /\bdrhp\b|\bdraft red herring prospectus\b/i },
];

const GENERIC_VALID_MARKERS: Marker[] = [
  { label: "IPO Details", pattern: /\bipo details\b/i },
  { label: "Price Band", pattern: /\bprice band\b/i },
  { label: "Issue Size", pattern: /\bissue size\b/i },
  { label: "Lot Size", pattern: /\blot size\b/i },
  { label: "Registrar", pattern: /\bregistrar\b/i },
  { label: "Lead Manager", pattern: /\blead manager\b|\bmerchant banker\b|\bbrlm\b/i },
  { label: "Financials", pattern: /\bfinancials?\b|\bprofit after tax\b|\bpat\b/i },
];

const INTERSTITIAL_MARKERS: Marker[] = [
  { label: "advertisement", pattern: /\badvertisement\b|\badvert\b/i },
  { label: "sponsored", pattern: /\bsponsored\b/i },
  { label: "open account", pattern: /\bopen account\b/i },
  { label: "wait", pattern: /\bplease wait\b|\bwait\b/i },
  { label: "redirecting", pattern: /\bredirecting\b|\byou are being redirected\b/i },
  { label: "continue", pattern: /\bcontinue\b/i },
  { label: "page will load", pattern: /\bpage will load\b|\bload shortly\b/i },
  { label: "ad", pattern: /(^|\s)ad(\s|$)|(^|\s)ads(\s|$)/i },
];

const CAPTCHA_MARKERS: Marker[] = [
  { label: "captcha", pattern: /\bcaptcha\b|\bg-recaptcha\b|\bhcaptcha\b|\bturnstile\b/i },
  { label: "cloudflare challenge", pattern: /\bcf-challenge\b|\bcf-browser-verification\b|\bcloudflare\b.{0,80}\bchallenge\b/i },
  { label: "human verification", pattern: /\bverify you are human\b|\bchecking your browser\b|\bjust a moment\b/i },
  { label: "access blocked", pattern: /\baccess denied\b|\brequest blocked\b|\btoo many requests\b/i },
];

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizedText(value: string) {
  return normalizeIPONameClean(value).replace(/\s+/g, " ").trim();
}

function matchedLabels(markers: Marker[], source: string) {
  return markers.filter((marker) => marker.pattern.test(source)).map((marker) => marker.label);
}

function markersForProvider(provider: string) {
  if (provider === "CHITTORGARH") return CHITTORGARH_VALID_MARKERS;
  if (provider === "IPOPLATFORM") return IPOPLATFORM_VALID_MARKERS;
  if (provider === "FINOLOGY_TICKER") return FINOLOGY_VALID_MARKERS;
  return GENERIC_VALID_MARKERS;
}

export function detectIPOPageContent({ html, ipoName, provider, text }: DetectInput): IPOPageContentDetection {
  const source = compact(`${html ?? ""} ${text ?? ""}`);
  const lower = source.toLowerCase();
  const validMarkers = markersForProvider(provider);
  const matchedMarkers = matchedLabels(validMarkers, lower);
  const missingMarkers = validMarkers.filter((marker) => !marker.pattern.test(lower)).map((marker) => marker.label);
  const captchaMarkers = matchedLabels(CAPTCHA_MARKERS, lower);
  const interstitialMarkers = matchedLabels(INTERSTITIAL_MARKERS, lower);

  if (ipoName) {
    const normalizedIPO = normalizedText(ipoName);
    const normalizedSource = normalizedText(source);
    const ipoTokens = normalizedIPO.split(" ").filter((token) => token.length > 2);
    const matchedTokenCount = ipoTokens.filter((token) => normalizedSource.includes(token)).length;
    if (normalizedIPO && (normalizedSource.includes(normalizedIPO) || matchedTokenCount >= Math.min(3, ipoTokens.length))) {
      matchedMarkers.push("IPO/company name");
    } else {
      missingMarkers.push("IPO/company name");
    }
  }

  const minimumMarkers = provider === "CHITTORGARH" || provider === "IPOPLATFORM" ? 3 : 2;
  const uniqueMatched = Array.from(new Set(matchedMarkers));
  const hasValidIPOContent = uniqueMatched.length >= minimumMarkers;
  const isCaptchaOrBlocked = captchaMarkers.length > 0 && !hasValidIPOContent;
  const isInterstitialOnly = !hasValidIPOContent && interstitialMarkers.length > 0 && !isCaptchaOrBlocked;

  if (isCaptchaOrBlocked) {
    return {
      confidence: "high",
      isCaptchaOrBlocked: true,
      isInterstitialOnly: false,
      isValidIPOPage: false,
      matchedMarkers: [...uniqueMatched, ...captchaMarkers],
      missingMarkers,
      reason: "source_captcha_or_blocked",
    };
  }

  if (isInterstitialOnly) {
    return {
      confidence: interstitialMarkers.length >= 2 ? "high" : "medium",
      isCaptchaOrBlocked: false,
      isInterstitialOnly: true,
      isValidIPOPage: false,
      matchedMarkers: [...uniqueMatched, ...interstitialMarkers],
      missingMarkers,
      reason: "source_interstitial_only",
    };
  }

  if (hasValidIPOContent) {
    return {
      confidence: uniqueMatched.length >= minimumMarkers + 2 ? "high" : "medium",
      isCaptchaOrBlocked: false,
      isInterstitialOnly: false,
      isValidIPOPage: true,
      matchedMarkers: uniqueMatched,
      missingMarkers,
      reason: interstitialMarkers.length > 0 ? "valid_ipo_page_with_ad_text" : "valid_ipo_page",
    };
  }

  return {
    confidence: "low",
    isCaptchaOrBlocked: false,
    isInterstitialOnly: false,
    isValidIPOPage: false,
    matchedMarkers: uniqueMatched,
    missingMarkers,
    reason: "insufficient_ipo_markers",
  };
}
