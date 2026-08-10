import type { TickerItem } from "@/lib/ipoData";

interface MarketTickerProps {
  items: TickerItem[];
}

function topGmpAlert(items: TickerItem[]) {
  return items.slice().sort((a, b) => b.gmpPct - a.gmpPct)[0] ?? null;
}

function toneFor(value: number) {
  if (value > 0) {
    return "positive" as const;
  }

  if (value < 0) {
    return "negative" as const;
  }

  return "neutral" as const;
}

function percentLabel(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function MarketTicker({ items }: MarketTickerProps) {
  const alert = topGmpAlert(items);
  const topItems = items.slice(0, 4).map((item) => ({
    change: `GMP ₹${item.gmp}`,
    label: item.name,
    tone: toneFor(item.gmpPct),
    value: percentLabel(item.gmpPct),
  }));
  const tickerRows = [
    {
      label: "IPO LENS",
      value: "Public-source research",
      change: "Educational only",
      tone: "neutral" as const,
    },
    {
      label: "IPO WATCH",
      value: `${items.length} live ${items.length === 1 ? "record" : "records"}`,
      change: items.length > 0 ? "Synced GMP" : "Run public data sync",
      tone: "neutral" as const,
    },
    ...topItems,
    ...(alert
      ? [
          {
            label: "TOP GMP",
            value: alert.name,
            change: percentLabel(alert.gmpPct),
            tone: toneFor(alert.gmpPct),
          },
        ]
      : []),
  ];

  return (
    <div className="market-ticker" aria-label="Market ticker">
      <div className="market-ticker-track">
        {[...tickerRows, ...tickerRows].map((item, index) => (
          <div className="market-ticker-item" key={`${item.label}-${index}`}>
            <span className="market-ticker-label">{item.label}</span>
            <span className="market-ticker-value mono">{item.value}</span>
            <span className={`market-ticker-change ${item.tone}`}>{item.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
