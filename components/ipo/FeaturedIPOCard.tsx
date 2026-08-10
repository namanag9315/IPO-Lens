import Link from "next/link";
import { format } from "date-fns";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { estimateListingGainPct } from "@/lib/scoring";
import type { AIAnalysisLabel, ComputedIPO } from "@/types/ipo";

interface FeaturedIPOCardProps {
  ipo: ComputedIPO | null;
  label: AIAnalysisLabel | string;
  score: number;
}

function priceBand(ipo: ComputedIPO) {
  if (!ipo.price_band_low || !ipo.price_band_high) {
    return "TBA";
  }

  return `₹${ipo.price_band_low} – ₹${ipo.price_band_high}`;
}

function dateLabel(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy") : "TBA";
}

function signalTone(score: number) {
  if (score >= 71) {
    return "var(--green)";
  }

  if (score >= 51) {
    return "var(--amber)";
  }

  return "var(--red)";
}

function valueTone(value: number | null) {
  return value === null ? "" : value > 0 ? "data-positive" : value < 0 ? "data-negative" : "";
}

function percentLabel(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function MiniSpark({ values, positive = true }: { positive?: boolean; values: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="mini-spark" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          style={{
            background: positive ? "var(--green)" : "var(--line-strong)",
            height: `${Math.max(4, (value / max) * 28)}px`,
            opacity: index < values.length - 2 ? 0.45 : 1,
          }}
        />
      ))}
    </div>
  );
}

export default function FeaturedIPOCard({ ipo, label, score }: FeaturedIPOCardProps) {
  if (!ipo) {
    return (
      <Card className="featured-card">
        <p style={{ color: "var(--muted)", fontSize: 14 }}>No featured IPO available yet.</p>
      </Card>
    );
  }

  const latestGmp = ipo.latest_gmp;
  const gmpPremium = ipo.latest_gmp_percent ?? estimateListingGainPct(latestGmp, ipo.latest_public_gmp_snapshot?.issue_price ?? ipo.price_band_high);
  const retailDemand = ipo.latest_subscription?.retail_x ?? null;
  const totalDemand = ipo.latest_subscription?.total_x ?? null;
  const gmpValues = ipo.gmp_history.map((item) => item.gmp_value).filter((value) => value > 0).slice(-8);
  const totalSubscriptionValues = ipo.subscription_data.map((item) => item.total_x).filter((value) => value > 0).slice(-8);
  const retailSubscriptionValues = ipo.subscription_data.map((item) => item.retail_x).filter((value) => value > 0).slice(-8);
  const gaugeOffset = 251.2 - (Math.min(score, 100) / 100) * 251.2;
  const signalColor = signalTone(score);
  const gmpClass = valueTone(gmpPremium);

  return (
    <Card className="featured-card" style={{ ["--score-tone" as string]: signalColor }}>
      <div className="featured-card-head">
        <div className="card-title">Today&apos;s Featured IPO</div>
        <div className="live-research"><span /> Live research view</div>
      </div>

      <div className="featured-card-body">
        <div>
          <h2>{ipo.name}</h2>
          <p>{ipo.category?.toUpperCase() ?? "IPO"} · NSE/BSE · ₹{ipo.issue_size_cr ?? "NA"}Cr issue</p>
          <div className="featured-score-line">
            <div>
              <span>IPO Lens Score</span>
              <strong className="mono">{score}<em>/100</em></strong>
            </div>
            <div className="featured-signal">
              <span>Signal</span>
              <strong>{label}</strong>
            </div>
            <Badge tone={ipo.status === "open" ? "green" : ipo.status === "listed" ? "slate" : "amber"}>{ipo.status.toUpperCase()}</Badge>
          </div>
        </div>

        <div className="featured-gauge" aria-label={`IPO Lens Score ${score} out of 100`}>
          <svg viewBox="0 0 160 90" role="img">
            <path d="M20 80a60 60 0 0 1 120 0" fill="none" stroke="#E2E8F0" strokeLinecap="round" strokeWidth="16" />
            <path
              d="M20 80a60 60 0 0 1 120 0"
              fill="none"
              stroke="var(--score-tone)"
              strokeDasharray="251.2"
              strokeDashoffset={gaugeOffset}
              strokeLinecap="round"
              strokeWidth="16"
            />
            <path d="M80 76 L112 30" stroke="var(--primary-navy)" strokeLinecap="round" strokeWidth="7" />
            <circle cx="80" cy="76" fill="var(--primary-navy)" r="5" />
          </svg>
        </div>
      </div>

      <div className="featured-progress">
        <span style={{ width: `${Math.min(score, 100)}%` }} />
      </div>

      <div className="featured-metrics">
        <div>
          <span>GMP</span>
          <strong className={`mono ${gmpClass}`}>
            {gmpPremium === null ? "NA" : percentLabel(gmpPremium)}
          </strong>
          <small>{latestGmp === null ? "No public snapshot" : `GMP ₹${latestGmp}`}</small>
          {gmpValues.length > 0 ? <MiniSpark values={gmpValues} /> : null}
        </div>
        <div>
          <span>Total Subscription</span>
          <strong className="mono">{totalDemand === null ? "NA" : `${totalDemand.toFixed(1)}x`}</strong>
          {totalSubscriptionValues.length > 0 ? <MiniSpark values={totalSubscriptionValues} /> : null}
        </div>
        <div>
          <span>Retail Demand</span>
          <strong className="mono">{retailDemand === null ? "NA" : `${retailDemand.toFixed(1)}x`}</strong>
          {retailSubscriptionValues.length > 0 ? <MiniSpark values={retailSubscriptionValues} /> : null}
        </div>
        <div>
          <span>Price Band</span>
          <strong className="mono">{priceBand(ipo)}</strong>
        </div>
        <div>
          <span>Lot Size</span>
          <strong className="mono">{ipo.lot_size ?? "TBA"}</strong>
        </div>
        <div>
          <span>Closes On</span>
          <strong className="mono">{dateLabel(ipo.close_date)}</strong>
        </div>
      </div>

      <div className="plain-view-box">
        <div>
          <span>Plain-English view</span>
          <p>{ipo.ai_analysis?.summary ?? "Signal quality is calculated from GMP, subscription and issue details."}</p>
        </div>
        <Link href={`/ipo/${ipo.slug}`}>View full analysis →</Link>
      </div>
    </Card>
  );
}
