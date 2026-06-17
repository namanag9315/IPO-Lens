import { ShieldCheck } from "lucide-react";
import Card from "@/components/ui/Card";

export default function AllotmentPrivacyNotice() {
  return (
    <Card className="privacy-notice" style={{ background: "var(--blue-soft)", borderColor: "#bfdbfe", padding: 18 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <ShieldCheck size={20} color="var(--blue)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 style={{ color: "var(--ink)", fontSize: 14, fontWeight: 900, margin: "0 0 4px" }}>Privacy First</h3>
          <p style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            Your PAN or application number is used only for this check. It is not saved, logged, stored in cookies, or sent to analytics.
          </p>
        </div>
      </div>
    </Card>
  );
}
