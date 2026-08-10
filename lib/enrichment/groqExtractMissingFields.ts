import Groq from "groq-sdk";
import { missingFieldExtractionPrompt } from "@/lib/enrichment/prompts/missingFieldExtractionPrompt";
import { validateEnrichmentOutput } from "@/lib/enrichment/validateEnrichmentOutput";
import type { AIEnrichmentResult, SourceSnapshotRow } from "@/lib/enrichment/types";

function client() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function parseJsonOnly(content: string) {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned) as unknown;
}

export async function extractMissingFieldsWithGroq({
  ipoName,
  missingFields,
  sourceSnapshots,
}: {
  ipoName: string;
  missingFields: string[];
  sourceSnapshots: SourceSnapshotRow[];
}): Promise<AIEnrichmentResult> {
  if (sourceSnapshots.length === 0) {
    throw new Error("No source text available for enrichment.");
  }

  const completion = await client().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1800,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract Indian IPO data from source text. Use only the supplied source snapshots. Return valid JSON only. Never provide investment advice. Never infer live GMP, subscription, listing, allotment, target price, or recommendations.",
      },
      {
        role: "user",
        content: missingFieldExtractionPrompt({ ipoName, missingFields, sourceSnapshots }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty enrichment response.");
  }

  const parsed = parseJsonOnly(content);
  return validateEnrichmentOutput(parsed, missingFields, sourceSnapshots);
}
