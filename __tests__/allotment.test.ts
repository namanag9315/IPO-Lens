import { describe, it, expect } from "vitest";
import { checkAllotment } from "../lib/allotment/allotmentService";
import { AllotmentCheckRequest } from "../lib/allotment/types";

// Mock providers and validation for testing
describe("Allotment Service", () => {
  it("returns validation error for invalid PAN", async () => {
    const req: AllotmentCheckRequest = {
      ipoId: "TEST_IPO",
      registrar: "MOCK",
      checkType: "PAN",
      value: "INVALID",
    };
    const result = await checkAllotment(req);
    expect(result.status).toBe("ERROR");
    expect(result.message).toContain("Invalid PAN");
  });

  it("returns masked PAN for valid PAN", async () => {
    const req: AllotmentCheckRequest = {
      ipoId: "TEST_IPO",
      registrar: "MOCK",
      checkType: "PAN",
      value: "ABCDE1234F",
    };
    const result = await checkAllotment(req);
    // Mock provider behavior: Last char is '4' (even) -> NOT_ALLOTTED
    expect(result.status).toBe("NOT_ALLOTTED");
    expect(result.panMasked).toBe("ABCDE****F");
  });

  it("returns masked application number", async () => {
    const req: AllotmentCheckRequest = {
      ipoId: "TEST_IPO",
      registrar: "MOCK",
      checkType: "APPLICATION_NO",
      value: "APP12345",
    };
    const result = await checkAllotment(req);
    expect(result.applicationNumberMasked).toBe("AP****45");
  });

  it("returns UNAVAILABLE for stubbed registrars like KFINTECH", async () => {
    const req: AllotmentCheckRequest = {
      ipoId: "TEST_IPO",
      registrar: "KFINTECH",
      checkType: "PAN",
      value: "ABCDE1234F",
    };
    const result = await checkAllotment(req);
    expect(result.status).toBe("UNAVAILABLE");
  });
});
