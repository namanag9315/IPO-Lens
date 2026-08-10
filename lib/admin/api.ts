import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import type { AdminPermission } from "@/lib/admin/permissions";

export function adminError(error: unknown, fallback = "Admin request failed.") {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function readJsonBody<T>(request: Request, fallback: T): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getAdminOrResponse(request: Request, permissions: AdminPermission[] = ["view_admin"]) {
  return requireAdminApi(request, permissions);
}
