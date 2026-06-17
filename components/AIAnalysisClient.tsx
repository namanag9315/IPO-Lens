"use client";

import { useState } from "react";
import AIAnalysisBox from "@/components/AIAnalysisBox";
import type { AIResearchSummary } from "@/types/ipo";

interface AIAnalysisClientProps {
  ipoId: string;
  initialSummary: AIResearchSummary | string | null;
  initialScore: number;
  initialLabel: string;
}

export default function AIAnalysisClient({
  ipoId,
  initialSummary,
  initialScore,
  initialLabel,
}: AIAnalysisClientProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [score, setScore] = useState(initialScore);
  const [label, setLabel] = useState(initialLabel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-analysis", {
        body: JSON.stringify({ ipoId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        label?: string;
        score?: number;
        summary?: AIResearchSummary | string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate analysis.");
      }

      setSummary(payload.summary ?? null);
      setScore(payload.score ?? initialScore);
      setLabel(payload.label ?? initialLabel);
    } catch {
      setError("Failed to load IPO data. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <AIAnalysisBox label={label} loading={loading} onGenerate={generate} score={score} summary={summary} />
      {error ? <p style={{ color: "var(--red-signal)", fontSize: 12, marginTop: 10 }}>{error}</p> : null}
    </div>
  );
}
