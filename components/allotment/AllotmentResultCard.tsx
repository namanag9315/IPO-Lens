import Card from "@/components/ui/Card";
import { AllotmentResult } from "@/lib/allotment/types";
import { RegistrarLink } from "@/lib/allotment/registrarLinks";
import { CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AllotmentResultCard({ 
  result, 
  fallbackLinks 
}: { 
  result: AllotmentResult | null;
  fallbackLinks: RegistrarLink[];
}) {
  if (!result) return null;

  const config = {
    ALLOTTED: { color: "var(--green)", bg: "var(--green-soft)", border: "#bbf7d0", icon: CheckCircle2, text: "Allotted" },
    NOT_ALLOTTED: { color: "var(--muted)", bg: "var(--surface-soft)", border: "var(--line)", icon: XCircle, text: "Not Allotted" },
    PENDING: { color: "var(--amber)", bg: "var(--amber-soft)", border: "#fde68a", icon: Clock, text: "Pending" },
    UNAVAILABLE: { color: "var(--muted-2)", bg: "var(--surface-soft)", border: "var(--line)", icon: AlertCircle, text: "Unavailable" },
    ERROR: { color: "var(--red)", bg: "var(--red-soft)", border: "#fecaca", icon: AlertCircle, text: "Error" },
  };

  const style = config[result.status];
  const Icon = style.icon;

  return (
    <Card style={{ background: style.bg, borderColor: style.border, padding: 24, marginTop: 24 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <Icon size={32} color={style.color} />
        <div>
          <h3 style={{ color: style.color, fontSize: 20, fontWeight: 900, margin: 0 }}>{style.text}</h3>
          <p style={{ color: "var(--text)", fontSize: 14, margin: "4px 0 0" }}>
            {result.status === "UNAVAILABLE" 
              ? "Automatic check is not available for this registrar yet. You can check directly on the official registrar, BSE, or NSE website." 
              : result.message}
          </p>
        </div>
      </div>
      
      {result.status !== "UNAVAILABLE" && (
        <div style={{ borderTop: `1px solid ${style.border}`, paddingTop: 16, display: "grid", gap: 12, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>IPO Name</span>
            <strong style={{ color: "var(--ink)", fontWeight: 800 }}>{result.ipoName}</strong>
          </div>
          {result.investorName && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>Investor</span>
              <strong style={{ color: "var(--ink)", fontWeight: 800 }}>{result.investorName}</strong>
            </div>
          )}
          {result.panMasked && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>PAN</span>
              <strong className="mono" style={{ color: "var(--ink)", fontWeight: 800 }}>{result.panMasked}</strong>
            </div>
          )}
          {result.applicationNumberMasked && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>App No</span>
              <strong className="mono" style={{ color: "var(--ink)", fontWeight: 800 }}>{result.applicationNumberMasked}</strong>
            </div>
          )}
          {result.allottedShares !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>Shares</span>
              <strong className="mono" style={{ color: "var(--ink)", fontWeight: 800 }}>{result.allottedShares}</strong>
            </div>
          )}
        </div>
      )}

      {result.status === "UNAVAILABLE" && fallbackLinks.length > 0 && (
        <div style={{ borderTop: `1px solid ${style.border}`, paddingTop: 16, display: "grid", gap: 8 }}>
          {fallbackLinks.map((link) => (
            <Link 
              key={link.url}
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "#fff", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--border-default)",
                color: "var(--ink)", textDecoration: "none", fontSize: 14, fontWeight: 700
              }}
            >
              <span>{link.label}</span>
              <ExternalLink size={16} color="var(--muted)" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
