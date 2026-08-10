import Link from "next/link";
import RegistrarBadge from "@/components/allotment/RegistrarBadge";
import type { AllotmentIPOOption } from "@/lib/allotment/types";

function dateLabel(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "TBA";
}

export default function RecentAllotments({ ipos }: { ipos: AllotmentIPOOption[] }) {
  return (
    <div className="premium-card recent-allotments-card">
      <div className="allotment-card-head">
        <div>
          <span className="allotment-card-label">Recent allotments</span>
          <h3>Allotment watchlist</h3>
        </div>
      </div>
      <div className="recent-allotments-list">
        {ipos.slice(0, 5).map((ipo) => (
          <Link href={`/allotment?ipo=${ipo.slug}`} key={ipo.id}>
            <span>
              <strong>{ipo.name}</strong>
              <small>
                Allotment {dateLabel(ipo.allotmentDate)} · Listing {dateLabel(ipo.listingDate)}
              </small>
            </span>
            <RegistrarBadge registrar={ipo.registrar} />
          </Link>
        ))}
      </div>
    </div>
  );
}
