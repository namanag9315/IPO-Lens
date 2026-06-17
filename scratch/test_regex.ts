function parseLeadManagerPerformance(paragraph: string): {
  name: string | null;
  city: string | null;
  totalIpos: number | null;
  successRatePct: number | null;
  description: string;
} | null {
  if (!paragraph) return null;

  let totalIpos: number | null = null;
  const ipoMatch = paragraph.match(/(?:handled|managed|completed)\s+(\d+)\s+(?:SME\s+)?IPOs?/i);
  if (ipoMatch) {
    totalIpos = parseInt(ipoMatch[1], 10);
  }

  let successRatePct: number | null = null;
  
  // Try to find specific patterns first
  const gainMatch = paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of the\s+)?(?:SME\s+)?IPOs?\s+have\s+been\s+listed\s+with\s+listing\s+gains/i)
                 || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of the\s+)?(?:SME\s+)?IPOs?\s+listed\s+with\s+gains/i)
                 || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s+listed\s+with\s+gains/i)
                 || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s+listed\s+at\s+premium/i);
                 
  if (gainMatch) {
    successRatePct = parseFloat(gainMatch[1]);
  } else {
    const stdMatch = paragraph.match(/of\s+which\s+\(?(\d+(?:\.\d+)?)\s*%\)?(?:\s+of\s+the\s+SME\s+IPOs)?\s+have\s+been\s+listed\s+with\s+listing\s+gains/i)
                  || paragraph.match(/of\s+which\s+\(?(\d+(?:\.\d+)?)\s*%\)?(?:\s+of\s+the\s+SME\s+IPOs)?\s+listed\s+with\s+gains/i);
    if (stdMatch) {
      successRatePct = parseFloat(stdMatch[1]);
    } else {
      const anyPctMatch = paragraph.match(/\(?(\d+(?:\.\d+)?)\s*%\)?/g);
      if (anyPctMatch) {
        if (anyPctMatch.length === 1) {
          const pct = parseFloat(anyPctMatch[0].replace(/[()%]/g, ""));
          if (paragraph.toLowerCase().includes("discount") || paragraph.toLowerCase().includes("at par")) {
            successRatePct = 100 - pct;
          } else {
            successRatePct = pct;
          }
        } else {
          const gainsMatch = paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*(?:listed\s+)?with\s+gains/i) 
                          || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*(?:listed\s+)?at\s+premium/i)
                          || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*gains/i);
          if (gainsMatch) {
            successRatePct = parseFloat(gainsMatch[1]);
          }
        }
      }
    }
  }

  let name: string | null = null;
  let city: string | null = null;

  const cityMatch = paragraph.match(/(.+?),\s+based\s+in\s+([A-Za-z\s]+?)(?:[^a-zA-Z\s]+)?\s+(?:is|has)/i);
  if (cityMatch) {
    name = cityMatch[1].trim();
    city = cityMatch[2].trim();
  } else {
    const lmMatch = paragraph.match(/(.+?)\s+is\s+the\s+Lead\s+Manager/i);
    if (lmMatch) {
      name = lmMatch[1].trim();
    }
  }

  if (name) {
    name = name.replace(/^(Track Record of the Merchant Banker:\s*)/i, "").trim();
  }

  return {
    name: name || null,
    city: city || null,
    totalIpos: totalIpos || null,
    successRatePct: successRatePct || null,
    description: paragraph
  };
}

const testParagraphs = [
  "GYR Capital Advisors Private Limited, based in Ahmedabad is the Lead Manager (BRLM) of Horizon Reclaim IPO. GYR Capital Advisors Private Limited has handled 57 SME IPOs till date of which (93%) of the SME IPOs have been listed with listing gains. Read full review of GYR Capital Advisors Private Limited .",
  "XYZ Capital, based in Mumbai is the Lead Manager. XYZ Capital has handled 12 IPOs of which 75% listed with gains.",
  "Track Record of the Merchant Banker: ABC Advisors is the Lead Manager of this IPO. ABC Advisors has handled 5 SME IPOs, of which (40%) listed with discount/at par.",
  "MNO Merchant Banker, based in Delhi, has managed 10 IPOs, of which 20% listed at discount and 80% listed at premium.",
  "Some random paragraph that doesn't match."
];

testParagraphs.forEach((p, idx) => {
  console.log(`Test ${idx + 1}:`);
  console.log("Paragraph:", p);
  console.log("Parsed:", parseLeadManagerPerformance(p));
  console.log();
});
