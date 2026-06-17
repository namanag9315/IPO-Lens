"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getAnchorAllocationPct, getAnchorInvestorCategory, getAnchorShares } from "@/lib/anchorInvestorScoring";
import type { IPOAnchorInvestor } from "@/types/ipo";

interface AnchorInvestorTableProps {
  investors: IPOAnchorInvestor[];
}

function money(value: number | null | undefined) {
  return value === null || value === undefined ? "NA" : `₹${value.toFixed(value % 1 === 0 ? 0 : 1)}Cr`;
}

function price(value: number | null | undefined) {
  return value === null || value === undefined ? "NA" : `₹${value.toFixed(value % 1 === 0 ? 0 : 1)}`;
}

function number(value: number | null | undefined) {
  return value === null || value === undefined ? "NA" : new Intl.NumberFormat("en-IN").format(value);
}

function qualityLabel(investor: IPOAnchorInvestor) {
  if (investor.quality_tag) {
    return investor.quality_tag;
  }

  if (investor.is_marquee || investor.is_reputed) {
    return "Marquee";
  }

  return "Standard";
}

function SourceCell({ investor }: { investor: IPOAnchorInvestor }) {
  if (investor.source_url) {
    return (
      <a href={investor.source_url} rel="noreferrer" style={{ alignItems: "center", display: "inline-flex", gap: 6 }} target="_blank">
        {investor.source ?? "Source"}
        <ExternalLink size={13} />
      </a>
    );
  }

  return <span>{investor.source ?? "NA"}</span>;
}

export default function AnchorInvestorTable({ investors }: AnchorInvestorTableProps) {
  const [expanded, setExpanded] = useState(false);
  const sortedInvestors = useMemo(
    () => investors.slice().sort((a, b) => getAnchorAllocationPct(b) - getAnchorAllocationPct(a)),
    [investors],
  );
  const visibleInvestors = expanded ? sortedInvestors : sortedInvestors.slice(0, 10);

  if (investors.length === 0) {
    return (
      <div className="table-wrap" style={{ color: "var(--muted)", fontSize: 13, padding: 18 }}>
        Anchor investor list has not been added yet.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Investor</th>
              <th>Category</th>
              <th>Scheme</th>
              <th>Shares</th>
              <th>Amount</th>
              <th>Price</th>
              <th>Anchor Book</th>
              <th>Quality</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {visibleInvestors.map((investor) => (
              <tr key={investor.id}>
                <td>{investor.investor_name}</td>
                <td>{getAnchorInvestorCategory(investor)}</td>
                <td>{investor.scheme_name ?? "NA"}</td>
                <td className="mono">{number(getAnchorShares(investor))}</td>
                <td className="mono">{money(investor.amount_cr)}</td>
                <td className="mono">{price(investor.allocation_price)}</td>
                <td className="mono">{getAnchorAllocationPct(investor).toFixed(1)}%</td>
                <td>{qualityLabel(investor)}</td>
                <td>
                  <SourceCell investor={investor} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedInvestors.length > 10 ? (
        <button className="btn" onClick={() => setExpanded((value) => !value)} style={{ justifySelf: "start" }} type="button">
          {expanded ? "Show top 10 anchor investors" : `Show full investor list (${sortedInvestors.length})`}
        </button>
      ) : null}
    </div>
  );
}
