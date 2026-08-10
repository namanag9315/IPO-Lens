import { ShieldCheck } from "lucide-react";

export default function AllotmentPrivacyNotice() {
  return (
    <div className="allotment-privacy">
      <ShieldCheck size={18} />
      <p>
        Your PAN or application number is used only for this check. In manual mode, it is not saved, logged, stored in cookies, or sent to
        analytics.
      </p>
    </div>
  );
}
