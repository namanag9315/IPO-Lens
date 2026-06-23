"use server";

import { revalidatePath } from "next/cache";
import { headers, cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

// Authorization guard helper
function verifyAuth() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  // If not configured, we allow it (the UI will show a warning banner)
  if (!adminPassword) return;

  const cookiePassword = cookies().get("admin_password")?.value;
  if (cookiePassword !== adminPassword) {
    throw new Error("Unauthorized: Invalid admin credentials");
  }
}

// Authentication Actions
export async function verifyAndLoginAdmin(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return true; // No password configured, allow access
  }

  if (password === adminPassword) {
    cookies().set("admin_password", password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    return true;
  }
  return false;
}

export async function logoutAdmin() {
  cookies().delete("admin_password");
}

export async function checkAdminSession(): Promise<{ authenticated: boolean; configured: boolean }> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const configured = Boolean(adminPassword);

  if (!configured) {
    return { authenticated: true, configured: false };
  }

  const cookiePassword = cookies().get("admin_password")?.value;
  const authenticated = cookiePassword === adminPassword;

  return { authenticated, configured: true };
}

// Admin Actions
export async function fetchAdminIPOs() {
  verifyAuth();

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
  verifyAuth();

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
  verifyAuth();

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
  verifyAuth();

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
  verifyAuth();

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
  verifyAuth();

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
  verifyAuth();

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
  verifyAuth();

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
  verifyAuth();

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

export async function sendBrevoCampaignAction(subject: string, htmlContent: string, listId?: number) {
  verifyAuth();
  const { sendCampaign } = await import("@/lib/brevo");
  try {
    const result = await sendCampaign(subject, htmlContent, listId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to send Brevo campaign" };
  }
}


