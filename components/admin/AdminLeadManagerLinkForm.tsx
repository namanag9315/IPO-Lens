"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

interface LeadManagerOption {
  id: string;
  name: string;
}

export default function AdminLeadManagerLinkForm({
  ipoId,
  managers,
}: {
  ipoId: string;
  managers: LeadManagerOption[];
}) {
  const [isPrimary, setIsPrimary] = useState(true);
  const [leadManagerId, setLeadManagerId] = useState(managers[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState("lead_manager");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function linkLeadManager() {
    setStatus("loading");
    setMessage(null);

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch(`/api/admin/ipos/${ipoId}/lead-manager`, {
        body: JSON.stringify({ isPrimary, leadManagerId, role }),
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) throw new Error(json.error ?? "Unable to link lead manager.");

      setStatus("success");
      setMessage("Lead manager linked. Refresh this IPO page to see the updated SME track-record module.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to link lead manager.");
    }
  }

  return (
    <div className="admin-inline-import">
      <label>
        <span>Existing lead manager</span>
        <select disabled={managers.length === 0} onChange={(event) => setLeadManagerId(event.target.value)} value={leadManagerId}>
          {managers.length === 0 ? <option value="">No lead managers found</option> : null}
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Role</span>
        <input onChange={(event) => setRole(event.target.value)} value={role} />
      </label>
      <label className="admin-checkbox-row">
        <input checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} type="checkbox" />
        <span>Primary merchant banker</span>
      </label>
      <button className="ui-button ui-button-primary" disabled={status === "loading" || !leadManagerId} onClick={linkLeadManager} type="button">
        <Link2 size={15} />
        {status === "loading" ? "Linking..." : "Link to IPO"}
      </button>
      {message ? <p className={`admin-action-message ${status}`}>{message}</p> : null}
    </div>
  );
}
