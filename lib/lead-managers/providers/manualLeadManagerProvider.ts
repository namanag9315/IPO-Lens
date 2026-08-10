import type { LeadManagerProvider } from "@/lib/lead-managers/providers/baseLeadManagerProvider";

export const manualLeadManagerProvider: LeadManagerProvider = {
  key: "MANUAL",
  name: "Manual lead manager entry",
  async fetch() {
    return {
      errors: ["Manual provider does not fetch external data."],
      history: [],
      profile: null,
      recordsFound: 0,
      status: "FAILED",
    };
  },
};
