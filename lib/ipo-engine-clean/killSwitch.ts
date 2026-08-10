import { NextResponse } from "next/server";

export const AUTO_SYNC_DISABLED_RESPONSE = {
  reason: "Auto sync disabled",
  status: "SKIPPED",
} as const;

export function isAutoSyncDisabled() {
  return process.env.DISABLE_AUTO_SYNC === "true";
}

export function skippedByKillSwitch() {
  return {
    errors: [],
    failed: 0,
    found: 0,
    matched: 0,
    saved: 0,
    skipped: 0,
    status: "skipped" as const,
    success: true,
    syncType: "disabled",
    warnings: [AUTO_SYNC_DISABLED_RESPONSE.reason],
  };
}

export function killSwitchResponse() {
  return NextResponse.json(AUTO_SYNC_DISABLED_RESPONSE);
}
