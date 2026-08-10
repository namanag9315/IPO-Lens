"use client";

export interface FinancialYear {
  financial_year: string;
  revenue_cr: number | null;
  pat_cr: number | null;
  pat_margin_pct: number | null;
  roe_pct: number | null;
}

function moneyCr(value: number | null | undefined) {
  return value === null || value === undefined ? "Being verified" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}Cr`;
}

function pct(value: number | null | undefined) {
  return value === null || value === undefined ? "Being verified" : `${value.toFixed(1)}%`;
}

function growth(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || previous === null || previous === undefined || previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

export default function FinancialTable({ financials }: { financials: FinancialYear[] }) {
  const rows = financials.slice().sort((a, b) => b.financial_year.localeCompare(a.financial_year)).slice(0, 3);

  if (rows.length === 0) {
    return <div className="analysis-empty-state">Financial history is being verified. Once added, revenue, PAT, margin and return ratios will appear here.</div>;
  }

  return (
    <div className="analysis-table-wrap">
      <table className="analysis-table">
        <thead>
          <tr>
            <th>Year</th>
            <th>Revenue</th>
            <th>PAT</th>
            <th>Margin</th>
            <th>ROE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const previous = rows[index + 1];
            const revenueGrowth = growth(row.revenue_cr, previous?.revenue_cr);
            const patGrowth = growth(row.pat_cr, previous?.pat_cr);

            return (
              <tr key={row.financial_year}>
                <td className="mono">{row.financial_year}</td>
                <td>
                  <span className="mono">{moneyCr(row.revenue_cr)}</span>
                  {revenueGrowth !== null ? <em className={revenueGrowth >= 0 ? "positive" : "negative"}>{revenueGrowth >= 0 ? "+" : ""}{revenueGrowth.toFixed(1)}%</em> : null}
                </td>
                <td>
                  <span className="mono">{moneyCr(row.pat_cr)}</span>
                  {patGrowth !== null ? <em className={patGrowth >= 0 ? "positive" : "negative"}>{patGrowth >= 0 ? "+" : ""}{patGrowth.toFixed(1)}%</em> : null}
                </td>
                <td className="mono">{pct(row.pat_margin_pct)}</td>
                <td className="mono">{pct(row.roe_pct)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
