import type { TickerItem } from "@/lib/ipoData";

interface TickerTapeProps {
  items: TickerItem[];
}

function trendClass(item: TickerItem) {
  if (item.trend === "flat" || item.gmpPct === 0) {
    return "neutral";
  }

  return item.gmpPct > 0 ? "up" : "down";
}

export default function TickerTape({ items }: TickerTapeProps) {
  const visibleItems = items.length > 0 ? items : [{ name: "IPO WATCH", gmp: 0, gmpPct: 0, trend: "flat" as const }];
  const triplicated = [...visibleItems, ...visibleItems, ...visibleItems];

  return (
    <div className="market-strip" aria-label="Live IPO GMP ticker">
      <div className="market-inner">
        <span className="ticker-item">
          <span className="ticker-name">IPO WATCH</span>
          <span>{visibleItems.length} tracked issues</span>
          <span className="neutral">live GMP feed</span>
        </span>
        {triplicated.map((item, index) => (
          <span className="ticker-item" key={`${item.name}-${index}`}>
            <span className="ticker-name">{item.name}</span>
            <span className={trendClass(item)}>
              {item.gmpPct > 0 ? "+" : ""}
              {item.gmpPct.toFixed(1)}%
            </span>
            <span>GMP ₹{item.gmp}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
