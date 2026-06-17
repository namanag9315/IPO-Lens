import { AllotmentProvider, AllotmentCheckRequest, AllotmentResult } from "../types";
import { isValidPAN } from "../validation";
import { maskApplicationNumber, maskPAN } from "../mask";

export const mockProvider: AllotmentProvider = {
  name: "MOCK",
  async checkAllotment(request: AllotmentCheckRequest): Promise<AllotmentResult> {
    const timestamp = new Date().toISOString();

    const baseResult: Omit<AllotmentResult, "status" | "message"> = {
      ipoName: request.ipoId || "Mock IPO",
      investorName: "Mock Investor",
      allottedShares: null,
      applicationNumberMasked: request.checkType === "APPLICATION_NO" ? maskApplicationNumber(request.value) : null,
      panMasked: request.checkType === "PAN" ? maskPAN(request.value) : null,
      source: "Mock Provider",
      checkedAt: timestamp,
    };

    if (request.checkType === "PAN") {
      if (!isValidPAN(request.value)) {
        return { ...baseResult, status: "ERROR", message: "Invalid PAN format." };
      }

      const lastDigit = parseInt(request.value.charAt(8), 10);
      
      if (lastDigit % 2 !== 0) {
        return { ...baseResult, status: "ALLOTTED", allottedShares: 50, message: "Allotment successful." };
      } else {
        return { ...baseResult, status: "NOT_ALLOTTED", allottedShares: 0, message: "No shares allotted." };
      }
    }

    if (request.checkType === "APPLICATION_NO") {
      const lastChar = request.value.slice(-1);
      const isDigit = /^\d$/.test(lastChar);
      
      if (!isDigit) {
        return { ...baseResult, status: "ERROR", message: "Invalid Application Number format for mock testing." };
      }

      const digit = parseInt(lastChar, 10);
      if (digit % 2 !== 0) {
        return { ...baseResult, status: "ALLOTTED", allottedShares: 50, message: "Allotment successful." };
      } else {
        return { ...baseResult, status: "NOT_ALLOTTED", allottedShares: 0, message: "No shares allotted." };
      }
    }

    return { ...baseResult, status: "PENDING", message: "Allotment status is pending or check type not supported by mock." };
  },
};
