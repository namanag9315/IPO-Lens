import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";
import type { ComputedIPO } from "@/types/ipo";
import { extractDomain, cleanAndFilterFinancials } from "@/lib/mappers/researchMapper";
import CompanyLogo from "@/components/ui/CompanyLogo";

interface WatchlistPanelProps {
  ipos: ComputedIPO[];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function score(ipo: ComputedIPO) {
  return calculateScore({
    anchorInvestors: ipo.anchor_investors,
    anchorSummary: ipo.anchor_summary,
    category: ipo.category,
    financials: cleanAndFilterFinancials(ipo.financials_yearly ?? []),
    gmp: ipo.latest_gmp ?? 0,
    issuePrice: ipo.price_band_high ?? 0,
    issueSizeCr: ipo.issue_size_cr ?? 0,
    niiX: ipo.latest_subscription?.nii_x ?? 0,
    objectsOfIssue: ipo.objects_of_issue,
    peers: ipo.peer_comparisons,
    qibX: ipo.latest_subscription?.qib_x ?? 0,
    retailX: ipo.latest_subscription?.retail_x ?? 0,
    totalX: ipo.latest_subscription?.total_x ?? 0,
  }).score;
}

export default function WatchlistPanel({ ipos }: WatchlistPanelProps) {
  const watchlist = ipos
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);

  return (
    <Card className="watchlist-panel" id="watchlist">
      <div className="watchlist-head">
        <h3>My Watchlist</h3>
        <MoreHorizontal size={18} />
      </div>

      <div className="watchlist-list">
        {watchlist.map((ipo) => {
          const itemScore = score(ipo);
          const gmp = estimateListingGainPct(ipo.latest_gmp ?? 0, ipo.price_band_high) ?? 0;
          const subscription = ipo.latest_subscription?.total_x ?? 0;

          return (
            <Link className="watchlist-row" href={`/ipo/${ipo.slug}`} key={ipo.id}>
              <span className="watchlist-avatar relative flex items-center justify-center">
                <CompanyLogo domain={extractDomain(ipo.company_profile?.website)} name={ipo.name} />
              </span>
              <span>
                <strong>{ipo.name}</strong>
                <em>{ipo.category === "sme" ? "SME" : "MAIN"} · NSE/BSE</em>
              </span>
              <Badge tone={ipo.status === "open" ? "green" : ipo.status === "listed" ? "blue" : "amber"}>{ipo.status.toUpperCase()}</Badge>
              <span className="mono watchlist-score">{itemScore}<small>Score</small></span>
              <span className="mono data-positive">{gmp >= 0 ? "+" : ""}{gmp.toFixed(0)}%<small>GMP</small></span>
              <span className="mono">{subscription ? `${subscription.toFixed(0)}x` : "NA"}<small>Subs. (x)</small></span>
            </Link>
          );
        })}
      </div>

      <Link className="watchlist-link" href="/#ipos">
        View full watchlist →
      </Link>
    </Card>
  );
}
