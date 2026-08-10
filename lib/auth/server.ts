import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error) {
    return null;
  }

  return data.user ?? null;
}
