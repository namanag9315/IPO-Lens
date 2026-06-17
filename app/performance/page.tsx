import { getPerformanceRows } from "@/lib/ipoData";

type PerformanceRows = Awaited<ReturnType<typeof getPerformanceRows>>;

function formatGain(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }
  const gain = value;
  const sign = gain > 0 ? "+" : "";

  return `${sign}${gain.toFixed(2)}%`;
}

function gainColor(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "var(--text-secondary)";
  }
  const gain = value;

  if (gain < 0) {
    return "var(--red-signal)";
  }

  if (gain <= 10) {
    return "var(--yellow-signal)";
  }

  return "var(--green-signal)";
}

function strongApplySummary(rows: PerformanceRows) {
  const strongApply = rows.filter((row) => row.ai_analysis?.label === "Strong Apply");
  const aboveTwenty = strongApply.filter((row) => (row.listing_gain_pct ?? 0) > 20).length;

  return `${aboveTwenty} out of ${strongApply.length} IPOs with Strong Apply listing above 20%`;
}

function highGMPAccuracy(rows: PerformanceRows) {
  const highGMP = rows.filter((row) => {
    if (!row.issue_price || row.final_gmp_at_close === null) {
      return false;
    }

    return (row.final_gmp_at_close / row.issue_price) * 100 >= 15;
  });

  if (highGMP.length === 0) {
    return 0;
  }

  const positiveListings = highGMP.filter((row) => (row.listing_gain_pct ?? 0) > 0).length;

  return (positiveListings / highGMP.length) * 100;
}

function stat(value: string, color = "var(--text-primary)") {
  return (
    <div className="mono" style={{ color, fontSize: 18, fontWeight: 700, lineHeight: 1.45 }}>
      {value}
    </div>
  );
}

export default async function PerformancePage() {
  const rows = await getPerformanceRows();
  const accuracy = highGMPAccuracy(rows);

  const strongApply = rows.filter((row) => row.ai_analysis?.label === "Strong Apply");
  const highGMP = rows.filter((row) => {
    if (!row.issue_price || row.final_gmp_at_close === null) {
      return false;
    }
    return (row.final_gmp_at_close / row.issue_price) * 100 >= 15;
  });
  const hasStats = strongApply.length > 0 || highGMP.length > 0;

  return (
    <main style={{ padding: "32px 24px 48px" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 700 }}>Listing Performance</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>How accurate was IPO Lens?</p>
      </header>

      {hasStats && (
        <section className="card" style={{ marginBottom: 24, padding: "18px 24px" }}>
          <div style={{ display: "grid", gap: 18 }}>
            {strongApply.length > 0 && stat(strongApplySummary(rows), "var(--text-primary)")}
            {highGMP.length > 0 && stat(`GMP accuracy: ${accuracy.toFixed(1)}% of high-GMP IPOs listed positive`, accuracy >= 70 ? "var(--green-signal)" : "var(--amber-500)")}
          </div>
        </section>
      )}

      <section className="card" style={{ overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              No IPOs have listed yet.
              <br />
              Performance data appears here post-listing.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 1080 }}>
              <div
                style={{
                  alignItems: "center",
                  borderBottom: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  display: "grid",
                  fontSize: 10,
                  fontWeight: 600,
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 1fr 1.2fr 1.2fr 70px 90px",
                  height: 36,
                  letterSpacing: "0.08em",
                  padding: "0 16px",
                  textTransform: "uppercase",
                }}
              >
                <span>IPO Name</span>
                <span>Issue Price</span>
                <span>GMP at Close</span>
                <span>Listing Price</span>
                <span>Listing Gain</span>
                <span>Current Price</span>
                <span>Current Gain</span>
                <span>Post-List Return</span>
                <span>Score</span>
                <span>Label</span>
              </div>

              {rows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    alignItems: "center",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 1fr 1.2fr 1.2fr 70px 90px",
                    height: 52,
                    padding: "0 16px",
                  }}
                >
                  <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>
                    {row.ipo?.name ?? "Unknown IPO"}
                    {row.ticker && (
                      <span style={{ display: "block", fontSize: 9, color: "var(--text-muted)", fontWeight: 400 }}>
                        {row.ticker}
                      </span>
                    )}
                  </span>
                  <span className="mono" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    ₹{row.issue_price ?? 0}
                  </span>
                  <span className="mono" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    ₹{row.final_gmp_at_close ?? 0}
                  </span>
                  <span className="mono" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {row.listing_price ? `₹${row.listing_price}` : "--"}
                  </span>
                  <span
                    className="mono"
                    style={{
                      color: gainColor(row.listing_gain_pct),
                      fontSize: 13,
                      fontWeight: (row.listing_gain_pct ?? 0) > 10 ? 700 : 500,
                    }}
                  >
                    {formatGain(row.listing_gain_pct)}
                  </span>
                  <span className="mono" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {row.current_price ? `₹${row.current_price}` : "--"}
                  </span>
                  <span
                    className="mono"
                    style={{
                      color: gainColor(row.current_gain_pct),
                      fontSize: 13,
                      fontWeight: (row.current_gain_pct ?? 0) > 10 ? 700 : 500,
                    }}
                  >
                    {formatGain(row.current_gain_pct)}
                  </span>
                  <span
                    className="mono"
                    style={{
                      color: gainColor(row.post_listing_return_pct),
                      fontSize: 13,
                      fontWeight: (row.post_listing_return_pct ?? 0) > 10 ? 700 : 500,
                    }}
                  >
                    {formatGain(row.post_listing_return_pct)}
                  </span>
                  <span className="mono" style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}>
                    {row.ai_analysis?.score ?? "--"}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                    {row.ai_analysis?.label ?? "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
