import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { createPANProfile, listPANProfiles } from "@/lib/allotment/panProfiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readJson(request: Request) {
  try {
    return (await request.json()) as { consent?: boolean; nickname?: string; pan?: string };
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to use saved PAN profiles.", profiles: [] }, { status: 401 });
  }

  try {
    return NextResponse.json({ profiles: await listPANProfiles(user.id) });
  } catch {
    return NextResponse.json({ error: "Unable to load saved PAN profiles." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to save PAN profiles." }, { status: 401 });
  }

  const body = await readJson(request);

  if (!body.consent) {
    return NextResponse.json({ error: "Consent is required before saving a PAN profile." }, { status: 400 });
  }

  if (!body.nickname?.trim() || !body.pan?.trim()) {
    return NextResponse.json({ error: "Nickname and PAN are required." }, { status: 400 });
  }

  try {
    const profile = await createPANProfile({ nickname: body.nickname, pan: body.pan, userId: user.id });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save PAN profile.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
