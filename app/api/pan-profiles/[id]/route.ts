import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { softDeletePANProfile } from "@/lib/allotment/panProfiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to delete saved PAN profiles." }, { status: 401 });
  }

  try {
    await softDeletePANProfile({ id: params.id, userId: user.id });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete PAN profile." }, { status: 500 });
  }
}
