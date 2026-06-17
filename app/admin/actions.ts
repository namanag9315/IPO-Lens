"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export async function fetchAdminIPOs() {
  const { data, error } = await supabaseAdmin
    .from("ipos")
    .select(`
      *,
      gmp_history (
        gmp_value,
        source,
        captured_at
      ),
      subscription_data (
        qib_x,
        nii_x,
        retail_x,
        total_x,
        captured_at
      ),
      ai_analysis (
        score,
        label,
        generated_at
      )
    `)
    .order("close_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function updateIPODetails(
  ipoId: string,
  fields: {
    price_band_low?: number | null;
    price_band_high?: number | null;
    lot_size?: number | null;
    issue_size_cr?: number | null;
    category?: "mainboard" | "sme" | null;
    open_date?: string | null;
    close_date?: string | null;
    listing_date?: string | null;
    status?: "upcoming" | "open" | "closed" | "listed";
    registrar_name?: string | null;
  }
) {
  const { error } = await supabaseAdmin
    .from("ipos")
    .update(fields)
    .eq("id", ipoId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleVerification(ipoId: string, verified: boolean) {
  const { error } = await supabaseAdmin
    .from("ipos")
    .update({ admin_verified: verified })
    .eq("id", ipoId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteIPO(ipoId: string) {
  const { error } = await supabaseAdmin
    .from("ipos")
    .delete()
    .eq("id", ipoId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function addManualGMP(ipoId: string, value: number, source: string) {
  const { error } = await supabaseAdmin
    .from("gmp_history")
    .insert({
      ipo_id: ipoId,
      gmp_value: value,
      source: source || "manual",
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function addManualSubscription(
  ipoId: string,
  data: {
    qib: number;
    nii: number;
    retail: number;
    total: number;
  }
) {
  const { error } = await supabaseAdmin
    .from("subscription_data")
    .insert({
      ipo_id: ipoId,
      qib_x: data.qib,
      nii_x: data.nii,
      retail_x: data.retail,
      total_x: data.total,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

export async function runSyncJob(jobType: "ipos" | "subscription" | "gmp") {
  try {
    const host = headers().get("host") || "localhost:3000";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const res = await fetch(`${baseUrl}/api/sync-${jobType}`, {
      method: "POST",
      headers: {
        Authorization: process.env.CRON_SECRET || "",
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to sync: ${res.statusText} (${txt})`);
    }

    return await res.ok ? { success: true } : { error: "Failed to trigger sync" };
  } catch (err: any) {
    console.error(`Sync job ${jobType} failed:`, err);
    return { error: err.message || "Failed to trigger sync job" };
  }
}

export async function runAIAnalysis(ipoId: string) {
  try {
    const host = headers().get("host") || "localhost:3000";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const res = await fetch(`${baseUrl}/api/generate-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ipoId }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to run AI Analysis: ${res.statusText} (${txt})`);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`AI analysis failed for ${ipoId}:`, err);
    return { error: err.message || "Failed to run AI analysis" };
  }
}

export async function fetchSyncLogs() {
  const { data, error } = await supabaseAdmin
    .from("ipo_data_sync_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

