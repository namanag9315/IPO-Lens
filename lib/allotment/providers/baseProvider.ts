import { AllotmentProvider, AllotmentCheckRequest, AllotmentResult } from "../types";
import { maskApplicationNumber, maskPAN } from "../mask";

export function createStubProvider(name: string): AllotmentProvider {
  return {
    name,
    async checkAllotment(request: AllotmentCheckRequest): Promise<AllotmentResult> {
      return {
        status: "UNAVAILABLE",
        ipoName: request.ipoId || "Unknown IPO",
        investorName: null,
        allottedShares: null,
        applicationNumberMasked: request.checkType === "APPLICATION_NO" ? maskApplicationNumber(request.value) : null,
        panMasked: request.checkType === "PAN" ? maskPAN(request.value) : null,
        source: name,
        checkedAt: new Date().toISOString(),
        message: "Live registrar integration is not enabled yet.",
      };
    },
  };
}
