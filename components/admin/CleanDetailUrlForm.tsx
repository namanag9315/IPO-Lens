"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

export default function CleanDetailUrlForm({
  initialUrl,
  ipoId,
  label = "Chittorgarh detail URL",
  placeholder = "https://www.chittorgarh.com/ipo/...",
  provider = "CHITTORGARH",
}: {
  initialUrl?: string | null;
  ipoId: string;
  label?: string;
  placeholder?: string;
  provider?: "CHITTORGARH" | "IPOPLATFORM" | "FINOLOGY_TICKER" | "IPOWATCH" | "INVESTORGAIN";
}) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState(initialUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function saveUrl() {
    setStatus("loading");
    setMessage(null);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/admin/ipo-engine/detail-url", {
        body: JSON.stringify({ ipoId, provider, sourceUrl }),
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(json.error ?? "Unable to save URL.");
      setStatus("success");
      setMessage(json.message ?? "Saved.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to save URL.");
    }
  }

  return (
    <div className="admin-action-inline" style={{ alignItems: "stretch", flexDirection: "column" }}>
      <label>
        <span>{label}</span>
        <input
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder={placeholder}
          value={sourceUrl}
        />
      </label>
      <button className="ui-button ui-button-secondary" disabled={status === "loading"} onClick={saveUrl} type="button">
        {status === "loading" ? "Saving..." : "Save detail URL"}
      </button>
      {message ? <span className={`admin-action-message ${status}`}>{message}</span> : null}
    </div>
  );
}
