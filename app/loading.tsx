export default function Loading() {
  return (
    <main style={{ padding: "24px", width: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <div className="skeleton-line" style={{ height: 24, width: 180 }} />
        <div className="skeleton-line" style={{ marginTop: 10, width: 320 }} />
      </div>

      <section className="card" style={{ marginBottom: 18, padding: "18px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40 }}>
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <div className="skeleton-line" style={{ width: 120 }} />
              <div className="skeleton-line" style={{ height: 20, marginTop: 10, width: 90 }} />
            </div>
          ))}
        </div>
      </section>

      <div className="ipo-grid">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div className="skeleton-card" key={item} style={{ animationDelay: `${item * 40}ms` }}>
            <div className="skeleton-line" style={{ height: 18, width: "72%" }} />
            <div className="skeleton-line" style={{ marginTop: 14, width: "38%" }} />
            <div className="skeleton-line" style={{ height: 34, marginTop: 28, width: "48%" }} />
            <div className="skeleton-line" style={{ marginTop: 32, width: "100%" }} />
            <div className="skeleton-line" style={{ marginTop: 14, width: "82%" }} />
            <div className="skeleton-line" style={{ marginTop: 14, width: "64%" }} />
          </div>
        ))}
      </div>
    </main>
  );
}
