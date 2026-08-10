import type { CleanProvider, CleanRecordType } from "@/lib/ipo-engine-clean/types";

const MASTER_CREATE_PROVIDERS = new Set<CleanProvider>(["IPO_GURU_API", "CHITTORGARH", "NSE", "BSE", "BSE_SME", "ADMIN"]);

export function canCreateIPO({
  matchConfidence,
  provider,
  recordType,
  slugExists,
}: {
  matchConfidence: number;
  provider: CleanProvider;
  recordType: CleanRecordType;
  slugExists: boolean;
}) {
  if (provider === "ADMIN") return { allowed: true, reason: "Admin manual create is allowed." };

  if (recordType !== "ipo_list") {
    return { allowed: false, reason: "Only approved IPO list sources can create IPO master records." };
  }

  if (!MASTER_CREATE_PROVIDERS.has(provider)) {
    return { allowed: false, reason: `${provider} is not approved for IPO master creation.` };
  }

  if (slugExists) return { allowed: false, reason: "Generated slug already exists." };
  if (matchConfidence >= 70) return { allowed: false, reason: "Potential duplicate detected; needs review." };

  return { allowed: true, reason: "Approved IPO list source and no duplicate signal." };
}
