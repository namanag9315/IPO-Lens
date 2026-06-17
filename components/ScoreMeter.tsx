interface ScoreMeterProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

function scoreColor(score: number) {
  if (score >= 71) {
    return "var(--green-signal)";
  }

  if (score >= 51) {
    return "var(--amber-500)";
  }

  if (score >= 31) {
    return "var(--yellow-signal)";
  }

  return "var(--red-signal)";
}

function scoreBackground(score: number) {
  if (score >= 71) {
    return "rgba(16, 185, 129, 0.06)";
  }

  if (score >= 31) {
    return "rgba(245, 158, 11, 0.06)";
  }

  return "rgba(239, 68, 68, 0.06)";
}

function scoreBorder(score: number) {
  if (score >= 71) {
    return "rgba(16, 185, 129, 0.2)";
  }

  if (score >= 31) {
    return "rgba(245, 158, 11, 0.2)";
  }

  return "rgba(239, 68, 68, 0.2)";
}

export default function ScoreMeter({ score, label, size = "sm" }: ScoreMeterProps) {
  const color = scoreColor(score);

  return (
    <div
      style={{
        alignItems: "center",
        background: scoreBackground(score),
        border: `1px solid ${scoreBorder(score)}`,
        borderRadius: 8,
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
        padding: size === "lg" ? "20px 24px" : "12px 16px",
      }}
    >
      <span
        className="mono"
        style={{
          color,
          fontSize: size === "lg" ? 52 : 28,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {score}
      </span>
      <span
        style={{
          color,
          fontSize: size === "lg" ? 11 : 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--text-muted)", fontSize: 9 }}>out of 100</span>
    </div>
  );
}
