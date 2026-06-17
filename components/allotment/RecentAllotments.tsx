import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { ComputedIPO } from "@/types/ipo";
import { isSameDay, parseISO, startOfDay } from "date-fns";

export default function RecentAllotments({ ipos }: { ipos: ComputedIPO[] }) {
  const today = startOfDay(new Date());
  const allotments = ipos.filter((ipo) => {
    const allotmentDate = ipo.enriched_data?.allotment_date as string | undefined;
    return allotmentDate && isSameDay(startOfDay(parseISO(allotmentDate)), today);
  });

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ color: "var(--ink)", fontSize: 18, fontWeight: 900, marginBottom: 16 }}>Expected Today</h3>
      {allotments.length === 0 ? (
        <Card style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          No allotments expected today.
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {allotments.map((ipo) => (
            <Card key={ipo.slug} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ color: "var(--ink)", fontSize: 15, display: "block", marginBottom: 4 }}>{ipo.name}</strong>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{ipo.registrar_name || "Unknown Registrar"}</span>
              </div>
              <Badge tone="amber">
                Expected
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
