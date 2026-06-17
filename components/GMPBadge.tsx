interface GMPBadgeProps {
  gmp: number;
  issuePrice: number;
  size?: "sm" | "lg";
}

function gmpColor(gmpPct: number) {
  if (gmpPct > 15) {
    return "var(--green-signal)";
  }

  if (gmpPct >= 5) {
    return "var(--yellow-signal)";
  }

  return "var(--red-signal)";
}

export default function GMPBadge({ gmp, issuePrice, size = "sm" }: GMPBadgeProps) {
  const gmpPct = issuePrice > 0 ? (gmp / issuePrice) * 100 : 0;

  return (
    <div>
      <div style={{ alignItems: "baseline", display: "flex", gap: 8 }}>
        <span
          className="mono"
          style={{
            color: "var(--text-primary)",
            fontSize: size === "lg" ? 36 : 20,
            fontWeight: 700,
          }}
        >
          ₹{gmp}
        </span>
        <span
          className="mono"
          style={{
            color: gmpColor(gmpPct),
            fontSize: size === "lg" ? 16 : 12,
            fontWeight: 500,
          }}
        >
          {gmp >= 0 ? "+" : ""}
          {gmpPct.toFixed(1)}%
        </span>
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2 }}>vs issue price</div>
    </div>
  );
}
