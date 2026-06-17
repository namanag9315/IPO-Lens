import Badge from "@/components/ui/Badge";
import { Registrar } from "@/lib/allotment/types";

export default function RegistrarBadge({ registrar }: { registrar: Registrar }) {
  const labelMap: Record<Registrar, string> = {
    MOCK: "Mock Provider",
    KFINTECH: "KFin Technologies",
    MUFG_INTIME: "Link Intime",
    BIGSHARE: "Bigshare Services",
    BSE: "BSE India",
    NSE: "NSE India",
  };
  return <Badge tone="slate">{labelMap[registrar] || registrar}</Badge>;
}
