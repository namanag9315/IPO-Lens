import type { TickerItem, LiveIndexItem } from "@/lib/ipoData";

interface MarketTickerProps {
  items: TickerItem[];
  indices?: LiveIndexItem[];
}

const marketItems = [
  { label: "NIFTY 50", value: "23,420.35", change: "+0.42%", tone: "positive" as const },
  { label: "SENSEX", value: "76,812.20", change: "+0.38%", tone: "positive" as const },
  { label: "NIFTY BANK", value: "50,184.10", change: "-0.21%", tone: "negative" as const },
  { label: "INDIA VIX", value: "13.82", change: "-1.64%", tone: "negative" as const },
];

function topGmpAlert(items: TickerItem[]) {
  return items.slice().sort((a, b) => b.gmpPct - a.gmpPct)[0] ?? null;
}

export default function MarketTicker({ items, indices }: MarketTickerProps) {
  const alert = topGmpAlert(items);
  const activeIndices = indices && indices.length > 0 ? indices : marketItems;
  const tickerRows = [
    ...activeIndices,
    {
      label: "IPO WATCH",
      value: `${items.length || 6} tracked issues`,
      change: "3 strong signals",
      tone: "neutral" as const,
    },
    {
      label: "GMP ALERT",
      value: alert?.name ?? "VAYUDATA",
      change: alert ? `+${alert.gmpPct.toFixed(1)}%` : "+19.4%",
      tone: "positive" as const,
    },
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
