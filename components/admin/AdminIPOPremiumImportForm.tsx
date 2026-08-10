"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminIPOPremiumImportForm({ ipoId }: { ipoId: string }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const handleImport = async (dryRun: boolean) => {
    if (!sourceUrl) return alert("Please enter a source URL");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/ipos/${ipoId}/import-detail-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          provider: "IPO_PREMIUM",
          force: false,
          dryRun,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (!dryRun) {
        router.refresh();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel">
      <h2>Deterministic Details Import</h2>
      <p className="admin-muted">Import core factual data from IPO Premium using deterministic HTML parsing.</p>
      <div className="admin-form-grid" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <label>
          <span>Source URL (IPO Premium)</span>
          <input
            type="url"
            placeholder="https://ipopremium.com/..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          className="ui-button ui-button-secondary"
          onClick={() => handleImport(true)}
          disabled={loading}
        >
          {loading ? "Processing..." : "Dry Run"}
        </button>
        <button
          className="ui-button ui-button-primary"
          onClick={() => handleImport(false)}
          disabled={loading}
        >
          {loading ? "Processing..." : "Run Full IPO Detail Import"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '4px' }}>
          <h3>Import Summary {result.status === 'DRY_RUN' && '(Dry Run)'}</h3>
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>Tables Updated:</strong> {result.tablesUpdated?.length ? result.tablesUpdated.join(", ") : "None"}</p>
          <p><strong>Fields Imported:</strong> {result.fieldsImported?.length ? result.fieldsImported.join(", ") : "None"}</p>
          <p><strong>Missing:</strong> {result.missingAfterImport?.length ? result.missingAfterImport.join(", ") : "None"}</p>
          <p><strong>Skipped:</strong> {result.fieldsSkipped?.length ? result.fieldsSkipped.join(", ") : "None"}</p>
          {result.errors?.length > 0 && (
            <p style={{ color: 'var(--color-danger)' }}><strong>Errors:</strong> {result.errors.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
