import { registrarLabel } from "@/lib/allotment/registrarLinks";
import type { AllotmentRegistrar } from "@/lib/allotment/types";

export default function RegistrarBadge({ registrar }: { registrar: AllotmentRegistrar | null }) {
  return <span className="registrar-badge">{registrarLabel(registrar)}</span>;
}
