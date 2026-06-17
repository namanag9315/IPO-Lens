import Groq from "groq-sdk";
import { calculateAnchorInvestorScore } from "@/lib/anchorInvestorScoring";
import type {
  AIResearchSummary,
  GMPHistory,
  IPO,
  IPOAnchorInvestor,
  IPOAnchorSummary,
  IPOCompanyProfile,
  IPOFinancialYearly,
  IPOObjectOfIssue,
  IPOPeerComparison,
  ScoreBreakdown,
  SubscriptionData,
} from "@/types/ipo";

export interface AnalysisInput {
  ipo: IPO;
  companyProfile: IPOCompanyProfile | null;
  financials: IPOFinancialYearly[];
  peers: IPOPeerComparison[];
  gmpHistory: GMPHistory[];
  subscriptionHistory: SubscriptionData[];
  anchorSummary: IPOAnchorSummary | null;
  topAnchorInvestors: IPOAnchorInvestor[];
  objectsOfIssue: IPOObjectOfIssue[];
  riskFactors: string[];
  score: number;
  label: string;
  scoreBreakdown: ScoreBreakdown;
}

interface DataFreshness {
  generatedAt: string;
  latestGmpCapturedAt: string | null;
  latestSubscriptionCapturedAt: string | null;
  latestFinancialYear: string | null;
  companyProfileUpdatedAt: string | null;
  anchorSummaryUpdatedAt: string | null;
  gmpDataAgeHours: number | null;
  subscriptionDataAgeHours: number | null;
}

function groqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

function hoursSince(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Number(((Date.now() - timestamp) / (1000 * 60 * 60)).toFixed(1));
}

function latestFinancialYear(financials: IPOFinancialYearly[]) {
  return financials
    .map((item) => item.financial_year)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function dataFreshness(input: AnalysisInput): DataFreshness {
  const latestGmpCapturedAt = input.gmpHistory[0]?.captured_at ?? null;
  const latestSubscriptionCapturedAt = input.subscriptionHistory[0]?.captured_at ?? null;

  return {
    generatedAt: new Date().toISOString(),
    latestGmpCapturedAt,
    latestSubscriptionCapturedAt,
    latestFinancialYear: latestFinancialYear(input.financials),
    companyProfileUpdatedAt: input.companyProfile?.updated_at ?? null,
    anchorSummaryUpdatedAt: input.anchorSummary?.updated_at ?? null,
    gmpDataAgeHours: hoursSince(latestGmpCapturedAt),
    subscriptionDataAgeHours: hoursSince(latestSubscriptionCapturedAt),
  };
}

function valuationMetrics(input: AnalysisInput) {
  const latestFinancial = input.financials
    .slice()
    .sort((a, b) => a.financial_year.localeCompare(b.financial_year))
    .at(-1);
  const issuePrice = input.ipo.price_band_high ?? null;
  const eps = latestFinancial?.eps ?? null;
  const issuePe = issuePrice && eps && eps > 0 ? Number((issuePrice / eps).toFixed(2)) : null;
  const peerPEs = input.peers.map((peer) => peer.pe_ratio).filter((value): value is number => value !== null && value > 0);
  const averagePeerPe = peerPEs.length ? Number((peerPEs.reduce((sum, value) => sum + value, 0) / peerPEs.length).toFixed(2)) : null;

  return {
    issuePrice,
    latestFinancialYear: latestFinancial?.financial_year ?? null,
    eps,
    issuePe,
    averagePeerPe,
    peerCount: input.peers.length,
  };
}

function fallbackSummary(input: AnalysisInput): AIResearchSummary {
  const anchorAnalysis = calculateAnchorInvestorScore({
    investors: input.topAnchorInvestors,
    summary: input.anchorSummary,
    issueSizeCr: input.ipo.issue_size_cr,
    priceBandHigh: input.ipo.price_band_high,
    category: input.ipo.category,
  });

  return {
    summary: `${input.ipo.name} has a ${input.label.toLowerCase()} from the available structured data. The score is limited by the completeness of financial, valuation, anchor and risk data.`,
    positives: [],
    negatives: [],
    anchorInvestorView:
      input.topAnchorInvestors.length > 0
        ? `${anchorAnalysis.interpretation}: anchor quality score is ${anchorAnalysis.anchor_quality_score}/100.`
        : "Anchor investor data is not available.",
    valuationView: input.peers.length > 0 ? "Peer comparison data is available for valuation review." : "Peer comparison data is not available.",
    fundamentalsView: input.financials.length > 0 ? "Financial history is available for trend review." : "Financial history is not available.",
    subscriptionView:
      input.subscriptionHistory.length > 0 ? "Subscription data is available and should be read by investor category." : "Subscription data is not available.",
    gmpView:
      input.gmpHistory.length > 0
        ? "GMP is available and should be treated as unofficial market sentiment, not a listing gain guarantee."
        : "GMP history is not available.",
    objectsOfIssueView: input.objectsOfIssue.length > 0 ? "Objects of the issue are available for use-of-proceeds review." : "Objects data is not available.",
    retailInvestorView: "No personalised recommendation is provided. Review the signal strength, risks and source documents before deciding.",
    dataQualityNote: "This summary uses only structured IPO Lens data. Missing fields reduce confidence.",
  };
}

function parseJSON(content: string, input: AnalysisInput): AIResearchSummary {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<AIResearchSummary>;

    return {
      ...fallbackSummary(input),
      ...parsed,
      positives: Array.isArray(parsed.positives) ? parsed.positives.map(String) : [],
      negatives: Array.isArray(parsed.negatives) ? parsed.negatives.map(String) : [],
    };
  } catch {
    return fallbackSummary(input);
  }
}

export async function generateIPOAnalysis(input: AnalysisInput): Promise<AIResearchSummary> {
  const client = groqClient();
  const anchorQualityAnalysis = calculateAnchorInvestorScore({
    investors: input.topAnchorInvestors,
    summary: input.anchorSummary,
    issueSizeCr: input.ipo.issue_size_cr,
    priceBandHigh: input.ipo.price_band_high,
    category: input.ipo.category,
  });
  const freshness = dataFreshness(input);
  const structuredPayload = {
    ipo: input.ipo,
    companyProfile: input.companyProfile,
    financials: input.financials,
    valuationMetrics: valuationMetrics(input),
    peerComparison: input.peers,
    gmpHistory: input.gmpHistory,
    subscriptionHistory: input.subscriptionHistory,
    anchorInvestorSummary: input.anchorSummary,
    anchorQualityAnalysis,
    topAnchorInvestors: input.topAnchorInvestors,
    objectsOfIssue: input.objectsOfIssue,
    riskFactors: input.riskFactors,
    finalIpoLensScore: input.score,
    finalIpoLensLabel: input.label,
    scoreBreakdown: input.scoreBreakdown,
    dataFreshness: freshness,
  };
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1000,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are IPO Lens, an Indian IPO research assistant. You explain IPO data in plain English for educational purposes only.\n\nRules:\n1. Do not provide personalised investment advice.\n2. Do not guarantee listing gains.\n3. Do not invent missing data.\n4. Use only structured data provided.\n5. Treat GMP as unofficial market sentiment.\n6. Treat anchor investor participation as a confidence signal, not a guarantee.\n7. Separate positives, negatives, valuation view, anchor investor view and retail investor view.\n8. Mention missing or stale data clearly.\n9. Keep tone balanced and professional.\n10. Output valid JSON only.",
      },
      {
        role: "user",
        content: `Generate a detailed but concise IPO research explanation using only this structured IPO Lens database payload.

Return exactly this JSON shape:
{
  "summary": "string",
  "positives": ["string"],
  "negatives": ["string"],
  "fundamentalsView": "string",
  "valuationView": "string",
  "subscriptionView": "string",
  "gmpView": "string",
  "anchorInvestorView": "string",
  "objectsOfIssueView": "string",
  "retailInvestorView": "string",
  "dataQualityNote": "string"
}

Allowed signal language: Strong signal, Positive signal, Neutral signal, Weak signal, High risk.
Keep arrays to 3-5 items. Keep every view to 1-3 concise sentences. If data is missing or stale, say that clearly instead of filling gaps.

Data:
${JSON.stringify(structuredPayload)}`,
      },
    ],
  });

  return parseJSON(completion.choices[0]?.message.content ?? "", input);
}

export async function extractStructuredDataFromHtml<T>(
  htmlSnippet: string,
  dataType: string,
  jsonSchema: string
): Promise<T | null> {
  try {
    const client = groqClient();
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert data extraction assistant. Your task is to extract ${dataType} from the provided HTML/text snippet and format it precisely as JSON matching the requested schema. Do not invent data. If a value is not present in the HTML snippet, use null. Output valid JSON only.`,
        },
        {
          role: "user",
          content: `Extract ${dataType} from the following HTML/text:

${htmlSnippet}

Return the data as a JSON object matching this schema:
${jsonSchema}`,
        },
      ],
    });

    const content = completion.choices[0]?.message.content ?? "";
    const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    console.error(`Error in extractStructuredDataFromHtml for ${dataType}:`, err.message);
    return null;
  }
}

export async function chatAboutIPO(
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  ipoContext: any
): Promise<string> {
  try {
    const client = groqClient();
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `You are IPO Lens AI, an expert financial analyst assistant. Your goal is to answer user queries about the Indian IPO: "${ipoContext.name}".
Use the following structured IPO data to answer the user's questions accurately. If some data is missing or not provided, state that honestly rather than inventing details.
Keep your answers professional, objective, balanced, and concise (2-4 sentences is usually best). Do not provide personalized investment advice.

IPO Context:
${JSON.stringify(ipoContext)}`,
        },
        ...chatHistory,
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    return completion.choices[0]?.message.content ?? "Sorry, I am unable to answer that question right now.";
  } catch (err: any) {
    console.error("Error in chatAboutIPO:", err.message);
    return "Sorry, I encountered an error while processing your request.";
  }
}


