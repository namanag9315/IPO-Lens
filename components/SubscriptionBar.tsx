interface SubscriptionBarProps {
  qib: number;
  nii: number;
  retail: number;
  total: number;
}

const rows = [
  { key: "qib", label: "QIB", color: "var(--blue-signal)" },
  { key: "nii", label: "NII", color: "var(--amber-500)" },
  { key: "retail", label: "RETAIL", color: "var(--green-signal)" },
] as const;

export default function SubscriptionBar({ qib, nii, retail, total }: SubscriptionBarProps) {
  const values = { qib, nii, retail };
  const unavailable = qib === 0 && nii === 0 && retail === 0 && total === 0;

  if (unavailable) {
    return <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Subscription data unavailable</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Total Subscription
        </span>
        <span
          className="mono"
          style={{
            color: "var(--text-primary)",
            fontSize: 22,
            fontWeight: 700,
            marginLeft: 12,
          }}
        >
          {total.toFixed(2)}x
        </span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => {
          const value = values[row.key];
          const width = (Math.min(value, 100) / 100) * 100;

          return (
            <div
              key={row.key}
              style={{
                alignItems: "center",
                display: "grid",
                gap: 12,
                gridTemplateColumns: "52px 1fr 60px",
              }}
            >
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {row.label}
              </span>
              <div
                style={{
                  background: "var(--navy-700)",
                  borderRadius: 2,
                  height: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: row.color,
                    borderRadius: 2,
                    height: "100%",
                    transition: "width 600ms ease",
                    width: `${width}%`,
                  }}
                />
              </div>
              <span
                className="mono"
                style={{
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "right",
                }}
              >
                {value.toFixed(1)}x
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
