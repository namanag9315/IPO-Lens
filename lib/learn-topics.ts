export type LearnTopic =
  | "gmp"
  | "subscription"
  | "priceBand"
  | "lotSize"
  | "ipoScore"
  | "smeIpo"
  | "drhp"
  | "rhp"
  | "allotment"
  | "listingGain";

export type LearnTopicContent = {
  title: string;
  shortDefinition: string;
  whyItMatters: string;
  warning: string;
  learnPageAnchor: string;
};

export const learnTopics = {
  gmp: {
    title: "What is GMP?",
    shortDefinition: "GMP means Grey Market Premium. It is an unofficial premium discussed before an IPO lists.",
    whyItMatters: "It can show market sentiment, but it changes quickly and may not match the listing price.",
    warning: "GMP is unofficial and does not guarantee listing gains.",
    learnPageAnchor: "/learn#gmp",
  },
  subscription: {
    title: "What is subscription?",
    shortDefinition: "Subscription shows how many times investors applied for the shares available in an IPO.",
    whyItMatters: "High demand can be a useful signal, especially when QIB, NII and retail participation are balanced.",
    warning: "High subscription does not guarantee listing gains.",
    learnPageAnchor: "/learn#subscription",
  },
  priceBand: {
    title: "What is price band?",
    shortDefinition: "The price band is the minimum and maximum price at which investors can bid for IPO shares.",
    whyItMatters: "It helps you estimate investment amount, valuation and possible listing scenarios.",
    warning: "A lower price is not automatically cheap. Always compare valuation and business quality.",
    learnPageAnchor: "/learn#price-band",
  },
  lotSize: {
    title: "What is lot size?",
    shortDefinition: "Lot size is the minimum number of shares needed for one IPO application lot.",
    whyItMatters: "It decides the minimum application amount for retail investors.",
    warning: "SME IPO lots can be large, so the minimum investment can be much higher.",
    learnPageAnchor: "/learn#lot-size",
  },
  ipoScore: {
    title: "What is IPO Score?",
    shortDefinition: "IPO Score is a rule-based educational signal created from available IPO data.",
    whyItMatters: "It gives a quick snapshot of fundamentals, demand, valuation, GMP, risks and data quality.",
    warning: "IPO Score is not a recommendation. Use it as a starting point for research.",
    learnPageAnchor: "/learn#ipo-score",
  },
  smeIpo: {
    title: "What is an SME IPO?",
    shortDefinition: "An SME IPO is an IPO by a smaller company listed on an SME exchange platform.",
    whyItMatters: "SME IPOs can offer early growth exposure, but they also need more careful research.",
    warning: "SME IPOs can be less liquid, more volatile and riskier for beginners.",
    learnPageAnchor: "/learn#sme-ipo",
  },
  drhp: {
    title: "What is DRHP?",
    shortDefinition: "DRHP means Draft Red Herring Prospectus. It is an early IPO document filed with SEBI.",
    whyItMatters: "It explains the company, risks, financials and why the company wants to raise money.",
    warning: "Read risk factors carefully. They often reveal the most important concerns.",
    learnPageAnchor: "/learn#drhp",
  },
  rhp: {
    title: "What is RHP?",
    shortDefinition: "RHP means Red Herring Prospectus. It is the updated IPO document before the issue opens.",
    whyItMatters: "It usually has final IPO details such as price band, dates and issue structure.",
    warning: "Do not rely only on headlines. Review the RHP before applying.",
    learnPageAnchor: "/learn#rhp",
  },
  allotment: {
    title: "What is allotment?",
    shortDefinition: "Allotment is the process of deciding who receives IPO shares after the bidding window closes.",
    whyItMatters: "When demand is high, not every retail applicant gets shares.",
    warning: "Applying does not guarantee allotment.",
    learnPageAnchor: "/learn#allotment",
  },
  listingGain: {
    title: "What is listing gain?",
    shortDefinition: "Listing gain is the return when shares list above the IPO issue price.",
    whyItMatters: "Many beginners track it, but long-term business quality also matters.",
    warning: "Listing gains are not guaranteed. IPOs can list flat or below issue price.",
    learnPageAnchor: "/learn#listing-gain",
  },
} satisfies Record<LearnTopic, LearnTopicContent>;
