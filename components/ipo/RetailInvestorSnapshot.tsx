export type RetailSnapshotTone = "green" | "amber" | "red" | "blue" | "slate";

export interface RetailSnapshotItem {
  explanation: string;
  label: string;
  status: string;
  tone: RetailSnapshotTone;
}

export default function RetailInvestorSnapshot({ items }: { items: RetailSnapshotItem[] }) {
  return (
    <div className="retail-snapshot-grid">
      {items.map((item) => (
        <div className={`retail-snapshot-card ${item.tone}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.status}</strong>
          <p>{item.explanation}</p>
        </div>
      ))}
    </div>
  );
}
