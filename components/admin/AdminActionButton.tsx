"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

export default function AdminActionButton({
  body,
  disabled = false,
  endpoint,
  label,
  method = "POST",
}: {
  body?: Record<string, unknown>;
  disabled?: boolean;
  endpoint: string;
  label: string;
  method?: "POST" | "PATCH" | "DELETE";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function runAction() {
    if (disabled) return;
    setStatus("loading");
    setMessage(null);

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch(endpoint, {
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        method,
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "Admin action failed.");
      }

      setStatus("success");
      setMessage(json.message ?? "Action completed.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  return (
    <div className="admin-action-inline">
      <button className="ui-button ui-button-primary" disabled={disabled || status === "loading"} onClick={runAction} type="button">
        <RefreshCw size={15} />
        {status === "loading" ? "Running..." : label}
      </button>
      {message ? <span className={`admin-action-message ${status}`}>{message}</span> : null}
    </div>
  );
}
