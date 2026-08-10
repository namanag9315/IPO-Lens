"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UnmatchedActionButtonsProps {
  recordId: string;
  suggestedIpoId?: string;
  ipos: Array<{ id: string; name: string }>;
}

export default function UnmatchedActionButtons({ recordId, suggestedIpoId, ipos }: UnmatchedActionButtonsProps) {
  const [selectedIpo, setSelectedIpo] = useState(suggestedIpoId || "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAction(action: "link" | "ignore") {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sync/unmatched/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, action, ipoId: selectedIpo }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Action failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <select
        value={selectedIpo}
        onChange={(e) => setSelectedIpo(e.target.value)}
        style={{ padding: "6px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--fg)" }}
        disabled={loading}
      >
        <option value="">-- Select IPO --</option>
        {ipos.map((ipo) => (
          <option key={ipo.id} value={ipo.id}>{ipo.name}</option>
        ))}
      </select>

      <button
        onClick={() => handleAction("link")}
        disabled={loading || !selectedIpo}
        className="admin-button"
        style={{ padding: "6px 12px" }}
      >
        Link & Reprocess
      </button>

      <button
        onClick={() => handleAction("ignore")}
        disabled={loading}
        className="admin-button"
        style={{ padding: "6px 12px", background: "transparent", color: "var(--warning)" }}
      >
        Ignore
      </button>
    </div>
  );
}
