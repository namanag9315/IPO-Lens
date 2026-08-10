import { decryptText, encryptText } from "@/lib/security/encryption";
import { hashPAN } from "@/lib/security/hash";
import { maskPAN, panLast4 } from "@/lib/allotment/mask";
import { isValidPAN, normalizePAN } from "@/lib/allotment/validation";
import { supabaseAdmin } from "@/lib/supabase";
import type { SavedPANProfile } from "@/lib/allotment/types";

interface PanProfileRow {
  id: string;
  nickname: string;
  pan_last4: string;
  pan_hash: string;
  pan_encrypted: string;
  created_at: string;
  deleted_at: string | null;
}

export function serializePANProfile(row: PanProfileRow): SavedPANProfile {
  return {
    createdAt: row.created_at,
    id: row.id,
    nickname: row.nickname,
    panLast4: row.pan_last4,
    panMasked: `*****${row.pan_last4}*`,
  };
}

export async function listPANProfiles(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_pan_profiles")
    .select("id,nickname,pan_last4,pan_hash,pan_encrypted,created_at,deleted_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PanProfileRow[]).map(serializePANProfile);
}

export async function createPANProfile(input: { nickname: string; pan: string; userId: string }) {
  const pan = normalizePAN(input.pan);

  if (!isValidPAN(pan)) {
    throw new Error("Enter a valid PAN.");
  }

  const panHash = hashPAN(pan);
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("user_pan_profiles")
    .select("id")
    .eq("user_id", input.userId)
    .eq("pan_hash", panHash)
    .is("deleted_at", null)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if ((existing ?? []).length > 0) {
    throw new Error("This PAN profile is already saved.");
  }

  const { data, error } = await supabaseAdmin
    .from("user_pan_profiles")
    .insert({
      consent_version: "2026-06-ipo-allotment-pan-v1",
      nickname: input.nickname.trim(),
      pan_encrypted: encryptText(pan),
      pan_hash: panHash,
      pan_last4: panLast4(pan),
      user_id: input.userId,
    })
    .select("id,nickname,pan_last4,pan_hash,pan_encrypted,created_at,deleted_at")
    .single();

  if (error) {
    throw error;
  }

  return serializePANProfile(data as PanProfileRow);
}

export async function softDeletePANProfile(input: { id: string; userId: string }) {
  const { error } = await supabaseAdmin
    .from("user_pan_profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}

export async function getDecryptedPANProfiles(input: { ids: string[]; userId: string }) {
  const { data, error } = await supabaseAdmin
    .from("user_pan_profiles")
    .select("id,nickname,pan_last4,pan_hash,pan_encrypted,created_at,deleted_at")
    .eq("user_id", input.userId)
    .in("id", input.ids)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return ((data ?? []) as PanProfileRow[]).map((row) => ({
    id: row.id,
    nickname: row.nickname,
    pan: decryptText(row.pan_encrypted),
    panMasked: maskPAN(decryptText(row.pan_encrypted)),
  }));
}
