"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

export default function AdminLeadManagerImportForm({ compact = false }: { compact?: boolean }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bulkStatus, setBulkStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const messageStatus = status === "idle" ? bulkStatus : status;

  async function runImport() {
    setStatus("loading");
    setMessage(null);

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/admin/lead-managers/import", {
        body: JSON.stringify({ provider: "IPO_PREMIUM", sourceUrl }),
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        leadManagerName?: string;
        message?: string;
        recordsFound?: number;
        recordsSaved?: number;
      };

      if (!response.ok) throw new Error(json.error ?? "Lead manager import failed.");

      setStatus("success");
      setMessage(json.message ?? `${json.leadManagerName ?? "Lead manager"} imported: ${json.recordsSaved ?? 0}/${json.recordsFound ?? 0} rows saved.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Lead manager import failed.");
    }
  }

  async function runDirectoryImport() {
    setBulkStatus("loading");
    setMessage(null);

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/admin/lead-managers/import-directory", {
        body: JSON.stringify({ limit: 25 }),
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        managersSaved?: number;
        message?: string;
        recordsSaved?: number;
      };

      if (!response.ok) throw new Error(json.error ?? "Lead manager directory import failed.");

      setBulkStatus("success");
      setMessage(json.message ?? `Imported ${json.managersSaved ?? 0} managers and ${json.recordsSaved ?? 0} past IPO rows.`);
    } catch (error) {
      setBulkStatus("error");
      setMessage(error instanceof Error ? error.message : "Lead manager directory import failed.");
    }
  }

  return (
    <div className={compact ? "admin-inline-import" : "admin-import-panel"}>
      <label>
        <span>IPO Premium lead-manager URL</span>
        <input
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://..."
          type="url"
          value={sourceUrl}
        />
      </label>
      <button className="ui-button ui-button-primary" disabled={status === "loading" || !sourceUrl.trim()} onClick={runImport} type="button">
        <UploadCloud size={15} />
        {status === "loading" ? "Importing..." : "Import lead manager"}
      </button>
      {!compact ? (
        <button className="ui-button ui-button-secondary" disabled={bulkStatus === "loading"} onClick={runDirectoryImport} type="button">
          <UploadCloud size={15} />
          {bulkStatus === "loading" ? "Parsing public directory..." : "Bulk import top 25"}
        </button>
      ) : null}
      {message ? <p className={`admin-action-message ${messageStatus}`}>{message}</p> : null}
    </div>
  );
}
