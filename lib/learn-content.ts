import type { LearnTopic } from "@/lib/learn-topics";

export const learnProgressSections = [
  { id: "what-is-ipo", label: "What is an IPO?" },
  { id: "ipo-journey", label: "IPO Journey" },
  { id: "allotment", label: "Allotment" },
  { id: "key-terms", label: "Key Terms" },
  { id: "analyze-ipo", label: "Analyze" },
  { id: "sme-ipo", label: "Mainboard vs SME" },
  { id: "risks", label: "Risks" },
  { id: "apply-framework", label: "Apply Framework" },
  { id: "quiz", label: "Quiz" },
];

export const heroTrustChips = ["Beginner Friendly", "100% Free", "Practical & Simple", "No Investment Advice"];

export const ipoBasicsCards = [
  {
    title: "Company raises capital",
    body: "The company collects money to fund growth, repay debt or support operations.",
  },
  {
    title: "Shares get listed",
    body: "After the IPO process, shares begin trading on a stock exchange.",
  },
  {
    title: "Investors can buy and sell",
    body: "Once listed, public investors can trade shares through the market.",
  },
];

export const journeyStages = [
  {
    title: "Company decides to raise money",
    explanation: "The company plans to raise capital from public investors.",
    investorNote: "Understand why the company needs money.",
    icon: "building",
  },
  {
    title: "DRHP filed with SEBI",
    explanation: "The company files a draft document with details about business, financials and risks.",
    investorNote: "Read risk factors and objects of issue.",
    icon: "file",
  },
  {
    title: "RHP and price band announced",
    explanation: "The final IPO details, price range and dates are announced before opening.",
    investorNote: "Check valuation, lot size and dates.",
    icon: "badge",
  },
  {
    title: "IPO opens for subscription",
    explanation: "Investors can apply during the bidding window.",
    investorNote: "Check GMP, subscription, financials and risks before applying.",
    icon: "cursor",
  },
  {
    title: "Allotment happens",
    explanation: "Applications are processed and shares are allotted based on demand.",
    investorNote: "High demand may reduce allotment chances.",
    icon: "check",
  },
  {
    title: "Listing day",
    explanation: "Shares start trading on the exchange at the listed market price.",
    investorNote: "Listing can be above, near or below issue price.",
    icon: "chart",
  },
];

export const keyTerms: Array<{
  id: string;
  topic?: LearnTopic;
  title: string;
  definition: string;
  example: string;
  warning?: string;
  icon: string;
}> = [
  {
    id: "issue-size",
    title: "Issue Size",
    definition: "The total money the company wants to raise through the IPO.",
    example: "If issue size is Rs 600 Cr, the IPO aims to raise Rs 600 crore.",
    icon: "wallet",
  },
  {
    id: "price-band",
    topic: "priceBand",
    title: "Price Band",
    definition: "The minimum and maximum price range for IPO bids.",
    example: "A price band of Rs 120-125 means you can bid within that range.",
    icon: "tags",
  },
  {
    id: "lot-size",
    topic: "lotSize",
    title: "Lot Size",
    definition: "The minimum number of shares needed for one IPO application lot.",
    example: "If lot size is 100 shares and price is Rs 125, minimum bid is Rs 12,500.",
    icon: "boxes",
  },
  {
    id: "gmp",
    topic: "gmp",
    title: "GMP",
    definition: "Grey Market Premium is an unofficial premium before listing.",
    example: "If issue price is Rs 100 and GMP is Rs 20, sentiment suggests Rs 120, but it is not guaranteed.",
    warning: "GMP is unofficial and should not be treated as a confirmed return.",
    icon: "activity",
  },
  {
    id: "subscription",
    topic: "subscription",
    title: "Subscription",
    definition: "How many times investors applied compared to shares available.",
    example: "10x subscription means demand was 10 times the shares offered.",
    icon: "users",
  },
  {
    id: "retail-category",
    title: "Retail Category",
    definition: "The IPO application category for small individual investors.",
    example: "Most beginner investors apply under the retail category.",
    icon: "user",
  },
  {
    id: "qib",
    title: "QIB",
    definition: "Qualified Institutional Buyers such as mutual funds, banks and institutions.",
    example: "Strong QIB demand can suggest institutional interest.",
    icon: "landmark",
  },
  {
    id: "nii-hni",
    title: "NII/HNI",
    definition: "Non-Institutional Investors, often high net-worth or larger applicants.",
    example: "High NII demand can add market interest but may be volatile.",
    icon: "briefcase",
  },
  {
    id: "allotment",
    topic: "allotment",
    title: "Allotment",
    definition: "The process of assigning IPO shares after applications close.",
    example: "If an IPO is heavily oversubscribed, many applicants may not get shares.",
    icon: "check",
  },
  {
    id: "listing-gain",
    topic: "listingGain",
    title: "Listing Gain",
    definition: "Gain when shares list above the IPO issue price.",
    example: "Issue price Rs 100 and listing Rs 115 means a 15% listing gain.",
    warning: "Listing gains are not guaranteed.",
    icon: "trending",
  },
  {
    id: "drhp",
    topic: "drhp",
    title: "DRHP",
    definition: "Draft Red Herring Prospectus, the early IPO document filed with SEBI.",
    example: "It includes business details, financials, risks and use of funds.",
    icon: "file",
  },
  {
    id: "rhp",
    topic: "rhp",
    title: "RHP",
    definition: "Red Herring Prospectus, the updated document before the IPO opens.",
    example: "It usually includes final dates, price band and issue details.",
    icon: "scroll",
  },
];

export const analysisChecklist = [
  {
    title: "Understand the business",
    body: "Can you explain what the company sells, who its customers are and how it makes money?",
    score: 16,
  },
  {
    title: "Check financial growth",
    body: "Look for steady revenue and profit growth instead of one lucky year.",
    score: 18,
  },
  {
    title: "Look at profitability and debt",
    body: "Profits, margins and manageable debt make the business easier to understand.",
    score: 17,
  },
  {
    title: "Compare valuation with peers",
    body: "A famous company can still be expensive. Compare P/E and other metrics with similar listed companies.",
    score: 15,
  },
  {
    title: "Study subscription and GMP",
    body: "Demand and market sentiment help, but do not apply only because GMP is high.",
    score: 14,
  },
  {
    title: "Read risks and objects of issue",
    body: "Know what can go wrong and how IPO money will be used before applying.",
    score: 20,
  },
];

export const riskCards = [
  { title: "Market Risk", body: "A weak market can affect listing even if the IPO looks popular.", tone: "amber", icon: "line" },
  { title: "Business Risk", body: "The company may face competition, margin pressure or customer concentration.", tone: "amber", icon: "building" },
  { title: "Valuation Risk", body: "A good company can still be expensive at the IPO price.", tone: "red", icon: "percent" },
  { title: "Liquidity Risk", body: "Some shares may not trade actively after listing, especially in SME IPOs.", tone: "amber", icon: "droplets" },
  { title: "GMP Risk", body: "GMP is unofficial, volatile and can disappear before listing.", tone: "red", icon: "alert" },
  { title: "Allotment Risk", body: "You may not receive shares even after applying.", tone: "blue", icon: "dice" },
  { title: "Listing Risk", body: "The stock can list below issue price and create a loss.", tone: "red", icon: "down" },
  { title: "SME Risk", body: "SME IPOs can have wider price swings and lower liquidity.", tone: "amber", icon: "shield" },
];

export const frameworkQuestions = [
  "Do I understand the company?",
  "Are revenues/profits growing?",
  "Is valuation reasonable?",
  "Is debt manageable?",
  "Are risks acceptable?",
  "Is GMP supported by subscription demand?",
  "Is it mainboard, or am I extra careful if it is SME?",
  "Can I handle listing loss?",
];

export const quizQuestions = [
  {
    question: "Is GMP a confirmed profit?",
    options: ["No", "Yes"],
    answer: "No",
    explanation: "GMP is unofficial market sentiment and does not guarantee listing gains.",
  },
  {
    question: "What is price band?",
    options: ["The IPO bid price range", "The company logo", "The listing date"],
    answer: "The IPO bid price range",
    explanation: "Price band is the minimum and maximum price range for IPO bids.",
  },
  {
    question: "Does high subscription always mean listing gain?",
    options: ["No", "Yes"],
    answer: "No",
    explanation: "High demand is useful, but listing price also depends on market mood, valuation and company quality.",
  },
  {
    question: "Why are SME IPOs riskier?",
    options: ["Lower liquidity and wider price swings", "They never list", "They have no price band"],
    answer: "Lower liquidity and wider price swings",
    explanation: "SME IPOs are smaller and can be less liquid after listing.",
  },
  {
    question: "What should you read before applying?",
    options: ["DRHP/RHP and risk factors", "Only social media posts", "Only GMP"],
    answer: "DRHP/RHP and risk factors",
    explanation: "Official documents and risks are more reliable than hype.",
  },
];
