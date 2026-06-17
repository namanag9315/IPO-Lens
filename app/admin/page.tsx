"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchAdminIPOs,
  updateIPODetails,
  toggleVerification,
  deleteIPO,
  addManualGMP,
  addManualSubscription,
  runSyncJob,
  runAIAnalysis,
  fetchSyncLogs
} from "./actions";

export default function AdminPortal() {
  const [ipos, setIpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ipos" | "override" | "sync" | "logs">("ipos");
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Override Form States
  const [selectedIpoId, setSelectedIpoId] = useState("");
  const [gmpValue, setGmpValue] = useState("");
  const [gmpSource, setGmpSource] = useState("manual");
  const [subQib, setSubQib] = useState("");
  const [subNii, setSubNii] = useState("");
  const [subRetail, setSubRetail] = useState("");
  const [subTotal, setSubTotal] = useState("");

  // Edit IPO States
  const [editingIpoId, setEditingIpoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Sync statuses
  const [syncStatus, setSyncStatus] = useState<Record<string, string>>({
    ipos: "Idle",
    subscription: "Idle",
    gmp: "Idle"
  });

  const [aiStatus, setAiStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoadingLogs(true);
      const logs = await fetchSyncLogs();
      setSyncLogs(logs);
    } catch (err) {
      console.error("Failed to load sync logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }


  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchAdminIPOs();
      setIpos(data);
      if (data.length > 0 && !selectedIpoId) {
        setSelectedIpoId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load admin IPOs:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleVerify = async (id: string, current: boolean) => {
    try {
      await toggleVerification(id, !current);
      // Update local state directly to feel instant
      setIpos(prev => prev.map(ipo => ipo.id === id ? { ...ipo, admin_verified: !current } : ipo));
    } catch (err) {
      alert("Error toggling verification status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this IPO? All associated GMP and subscription data will be lost.")) {
      return;
    }
    try {
      await deleteIPO(id);
      loadData();
    } catch (err) {
      alert("Error deleting IPO");
    }
  };

  const handleStartEdit = (ipo: any) => {
    setEditingIpoId(ipo.id);
    setEditForm({
      price_band_low: ipo.price_band_low ?? "",
      price_band_high: ipo.price_band_high ?? "",
      lot_size: ipo.lot_size ?? "",
      issue_size_cr: ipo.issue_size_cr ?? "",
      category: ipo.category ?? "mainboard",
      open_date: ipo.open_date ?? "",
      close_date: ipo.close_date ?? "",
      listing_date: ipo.listing_date ?? "",
      status: ipo.status ?? "upcoming",
      registrar_name: ipo.registrar_name ?? "",
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const payload = {
        price_band_low: editForm.price_band_low === "" ? null : Number(editForm.price_band_low),
        price_band_high: editForm.price_band_high === "" ? null : Number(editForm.price_band_high),
        lot_size: editForm.lot_size === "" ? null : Number(editForm.lot_size),
        issue_size_cr: editForm.issue_size_cr === "" ? null : Number(editForm.issue_size_cr),
        category: editForm.category,
        open_date: editForm.open_date || null,
        close_date: editForm.close_date || null,
        listing_date: editForm.listing_date || null,
        status: editForm.status,
        registrar_name: editForm.registrar_name || null,
      };

      await updateIPODetails(id, payload);
      setEditingIpoId(null);
      loadData();
    } catch (err) {
      alert("Failed to save changes");
    }
  };

  const handleManualGmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIpoId || !gmpValue) return;

    try {
      await addManualGMP(selectedIpoId, Number(gmpValue), gmpSource);
      setGmpValue("");
      alert("GMP record added successfully!");
      loadData();
    } catch (err) {
      alert("Failed to save GMP entry");
    }
  };

  const handleManualSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIpoId || !subTotal) return;

    try {
      await addManualSubscription(selectedIpoId, {
        qib: subQib === "" ? 0 : Number(subQib),
        nii: subNii === "" ? 0 : Number(subNii),
        retail: subRetail === "" ? 0 : Number(subRetail),
        total: Number(subTotal),
      });
      setSubQib("");
      setSubNii("");
      setSubRetail("");
      setSubTotal("");
      alert("Subscription record added successfully!");
      loadData();
    } catch (err) {
      alert("Failed to save subscription entry");
    }
  };

  const handleTriggerSync = async (type: "ipos" | "subscription" | "gmp") => {
    setSyncStatus(prev => ({ ...prev, [type]: "Syncing..." }));
    try {
      const res = await runSyncJob(type);
      if (res.error) {
        setSyncStatus(prev => ({ ...prev, [type]: `Error: ${res.error}` }));
      } else {
        setSyncStatus(prev => ({ ...prev, [type]: `Success! Updated.` }));
        loadData();
        loadLogs();
      }
    } catch (err) {
      setSyncStatus(prev => ({ ...prev, [type]: "Failed to trigger." }));
    }
  };

  const handleTriggerAI = async (id: string) => {
    setAiStatus(prev => ({ ...prev, [id]: "Analyzing..." }));
    try {
      const res = await runAIAnalysis(id);
      if (res.error) {
        setAiStatus(prev => ({ ...prev, [id]: `Error: ${res.error}` }));
      } else {
        setAiStatus(prev => ({ ...prev, [id]: `Score: ${res.score} (${res.label})` }));
        loadData();
      }
    } catch (err) {
      setAiStatus(prev => ({ ...prev, [id]: "Failed to run." }));
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", color: "var(--text)" }}>
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: "24px 0", minHeight: "90vh", background: "var(--bg)" }}>
      <div className="shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "var(--ink)" }}>Admin Portal</h1>
            <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "4px" }}>Manage IPO Lens metadata, manual overrides, and sync operations</p>
          </div>
          <Link href="/" className="btn" style={{ fontSize: "13px" }}>
            ← Live Dashboard
          </Link>
        </div>

        {/* Tab Controls */}
        <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              className={`btn ${activeTab === "ipos" ? "" : "btn-secondary"}`}
              onClick={() => setActiveTab("ipos")}
              style={{ padding: "6px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              IPO List & Details
            </button>
            <button 
              className={`btn ${activeTab === "override" ? "" : "btn-secondary"}`}
              onClick={() => setActiveTab("override")}
              style={{ padding: "6px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              Manual Overrides
            </button>
            <button 
              className={`btn ${activeTab === "sync" ? "" : "btn-secondary"}`}
              onClick={() => setActiveTab("sync")}
              style={{ padding: "6px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              Sync Console
            </button>
            <button 
              className={`btn ${activeTab === "logs" ? "" : "btn-secondary"}`}
              onClick={() => { setActiveTab("logs"); loadLogs(); }}
              style={{ padding: "6px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              Sync Logs
            </button>
          </div>
        </div>

        {/* Tab 1: IPO List */}
        {activeTab === "ipos" && (
          <div className="card" style={{ padding: "20px", display: "grid", gap: "20px", overflowX: "auto" }}>
            <h3 style={{ fontSize: "18px", color: "var(--ink)", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>All IPOs</h3>
            
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Name / Category</th>
                  <th style={{ padding: "10px" }}>Price Band</th>
                  <th style={{ padding: "10px" }}>Open / Close</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Latest GMP</th>
                  <th style={{ padding: "10px" }}>Verified</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ipos.map((ipo) => {
                  const isEditing = editingIpoId === ipo.id;
                  const latestGmp = ipo.gmp_history?.[0]?.gmp_value ?? "NA";
                  const aiAnalysis = ipo.ai_analysis?.[0];

                  return (
                    <tr key={ipo.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px", fontWeight: "600" }}>
                        {ipo.name}
                        <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "normal" }}>
                          {ipo.category?.toUpperCase() || "SME"} · {ipo.registrar_name || "No registrar"}
                          {ipo.enriched_data && (ipo.enriched_data as any).lead_manager && ` · LM: ${(ipo.enriched_data as any).lead_manager}`}
                        </div>
                        {ipo.enriched_data && 
                         (ipo.enriched_data as any).sources && 
                         typeof (ipo.enriched_data as any).sources === "object" && 
                         !Array.isArray((ipo.enriched_data as any).sources) && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                            {Object.entries((ipo.enriched_data as any).sources).map(([sec, src]: [string, any]) => (
                              <span 
                                key={sec} 
                                style={{ 
                                  fontSize: "9px", 
                                  padding: "2px 5px", 
                                  background: "#f1f5f9", 
                                  color: "#475569", 
                                  borderRadius: "4px", 
                                  border: "1px solid #cbd5e1" 
                                }}
                              >
                                {sec.replace("_", " ")}: <strong style={{ color: "#0f172a" }}>{typeof src === "object" ? JSON.stringify(src) : String(src)}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: "10px" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "4px", width: "120px" }}>
                            <input 
                              type="number" 
                              value={editForm.price_band_low} 
                              onChange={(e) => setEditForm({ ...editForm, price_band_low: e.target.value })}
                              placeholder="Min"
                              style={{ width: "50%", padding: "4px", border: "1px solid var(--border)", borderRadius: "4px" }}
                            />
                            <input 
                              type="number" 
                              value={editForm.price_band_high} 
                              onChange={(e) => setEditForm({ ...editForm, price_band_high: e.target.value })}
                              placeholder="Max"
                              style={{ width: "50%", padding: "4px", border: "1px solid var(--border)", borderRadius: "4px" }}
                            />
                          </div>
                        ) : (
                          ipo.price_band_low && ipo.price_band_high ? `₹${ipo.price_band_low} - ₹${ipo.price_band_high}` : "TBA"
                        )}
                      </td>

                      <td style={{ padding: "10px" }}>
                        {isEditing ? (
                          <div style={{ display: "grid", gap: "4px" }}>
                            <input 
                              type="date" 
                              value={editForm.open_date} 
                              onChange={(e) => setEditForm({ ...editForm, open_date: e.target.value })}
                              style={{ padding: "2px 4px", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "11px" }}
                            />
                            <input 
                              type="date" 
                              value={editForm.close_date} 
                              onChange={(e) => setEditForm({ ...editForm, close_date: e.target.value })}
                              style={{ padding: "2px 4px", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "11px" }}
                            />
                          </div>
                        ) : (
                          <span className="mono" style={{ fontSize: "11px" }}>
                            {ipo.open_date ? ipo.open_date : "TBA"} to {ipo.close_date ? ipo.close_date : "TBA"}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "10px" }}>
                        {isEditing ? (
                          <select 
                            value={editForm.status} 
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            style={{ padding: "4px", border: "1px solid var(--border)", borderRadius: "4px" }}
                          >
                            <option value="upcoming">Upcoming</option>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                            <option value="listed">Listed</option>
                          </select>
                        ) : (
                          <span className={`badge ${ipo.status}`} style={{ padding: "2px 6px", fontSize: "10px" }}>
                            {ipo.status?.toUpperCase()}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "10px" }} className="mono">
                        {latestGmp !== "NA" ? `₹${latestGmp}` : "NA"}
                      </td>

                      <td style={{ padding: "10px" }}>
                        <button 
                          onClick={() => handleToggleVerify(ipo.id, ipo.admin_verified)}
                          style={{
                            padding: "4px 10px",
                            fontSize: "11px",
                            background: ipo.admin_verified ? "var(--green)" : "var(--border)",
                            color: ipo.admin_verified ? "#fff" : "var(--ink)",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer"
                          }}
                        >
                          {ipo.admin_verified ? "Verified" : "Verify"}
                        </button>
                      </td>

                      <td style={{ padding: "10px", textAlign: "right" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button 
                              onClick={() => handleSaveEdit(ipo.id)}
                              className="btn" 
                              style={{ padding: "4px 8px", background: "var(--green)", color: "#fff", fontSize: "11px", borderColor: "var(--green)" }}
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingIpoId(null)}
                              className="btn" 
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                            <button 
                              onClick={() => handleTriggerAI(ipo.id)}
                              className="btn"
                              style={{ padding: "4px 8px", fontSize: "11px", color: "var(--primary-navy)", borderColor: "var(--primary-navy)" }}
                              disabled={aiStatus[ipo.id] === "Analyzing..."}
                            >
                              {aiStatus[ipo.id] || (aiAnalysis ? `AI Score: ${aiAnalysis.score}` : "Run AI")}
                            </button>
                            <button 
                              onClick={() => handleStartEdit(ipo)}
                              className="btn" 
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(ipo.id)}
                              className="btn" 
                              style={{ padding: "4px 8px", color: "var(--red)", borderColor: "var(--red)", fontSize: "11px" }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Override Input */}
        {activeTab === "override" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {/* GMP Form */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "18px", color: "var(--ink)", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                Add GMP Entry
              </h3>
              <form onSubmit={handleManualGmpSubmit} style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Select IPO</label>
                  <select 
                    value={selectedIpoId} 
                    onChange={(e) => setSelectedIpoId(e.target.value)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", background: "var(--card-bg)" }}
                    required
                  >
                    {ipos.map(ipo => (
                      <option key={ipo.id} value={ipo.id}>{ipo.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>GMP Value (₹)</label>
                  <input 
                    type="number" 
                    value={gmpValue}
                    onChange={(e) => setGmpValue(e.target.value)}
                    placeholder="e.g. 45"
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px" }}
                    required
                  />
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Source</label>
                  <input 
                    type="text" 
                    value={gmpSource}
                    onChange={(e) => setGmpSource(e.target.value)}
                    placeholder="e.g. manual"
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px" }}
                  />
                </div>

                <button type="submit" className="btn" style={{ background: "var(--primary-navy)", color: "#fff", padding: "8px", marginTop: "8px", cursor: "pointer", border: "none" }}>
                  Save GMP Entry
                </button>
              </form>
            </div>

            {/* Subscription Form */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "18px", color: "var(--ink)", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
                Add Subscription Entry
              </h3>
              <form onSubmit={handleManualSubSubmit} style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Select IPO</label>
                  <select 
                    value={selectedIpoId} 
                    onChange={(e) => setSelectedIpoId(e.target.value)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", background: "var(--card-bg)" }}
                    required
                  >
                    {ipos.map(ipo => (
                      <option key={ipo.id} value={ipo.id}>{ipo.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600" }}>QIB (x)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={subQib}
                      onChange={(e) => setSubQib(e.target.value)}
                      placeholder="e.g. 1.5"
                      style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                    />
                  </div>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600" }}>NII (x)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={subNii}
                      onChange={(e) => setSubNii(e.target.value)}
                      placeholder="e.g. 4.2"
                      style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600" }}>Retail (x)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={subRetail}
                      onChange={(e) => setSubRetail(e.target.value)}
                      placeholder="e.g. 12.3"
                      style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                    />
                  </div>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600" }}>Total (x) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={subTotal}
                      onChange={(e) => setSubTotal(e.target.value)}
                      placeholder="e.g. 8.1"
                      style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn" style={{ background: "var(--primary-navy)", color: "#fff", padding: "8px", marginTop: "8px", cursor: "pointer", border: "none" }}>
                  Save Subscription Entry
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Sync Operations */}
        {activeTab === "sync" && (
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "18px", color: "var(--ink)", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "16px" }}>
              Sync Operations Console
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
              Manually trigger background cron jobs to sync live data using the server-side cron secret.
            </p>

            <div style={{ display: "grid", gap: "16px" }}>
              {/* Sync IPOs */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div>
                  <h4 style={{ fontWeight: "600", fontSize: "14px" }}>Sync IPO List & Details</h4>
                  <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Pulls listings from IPOGuru and missing financials/KPIs from Chittorgarh.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>Status: {syncStatus.ipos}</span>
                  <button 
                    onClick={() => handleTriggerSync("ipos")}
                    className="btn" 
                    style={{ background: "var(--primary-navy)", color: "#fff", fontSize: "13px", cursor: "pointer" }}
                  >
                    Trigger Sync
                  </button>
                </div>
              </div>

              {/* Sync Subscription */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div>
                  <h4 style={{ fontWeight: "600", fontSize: "14px" }}>Sync Subscription Data</h4>
                  <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Pulls subscription records from BSE India and Chittorgarh.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>Status: {syncStatus.subscription}</span>
                  <button 
                    onClick={() => handleTriggerSync("subscription")}
                    className="btn" 
                    style={{ background: "var(--primary-navy)", color: "#fff", fontSize: "13px", cursor: "pointer" }}
                  >
                    Trigger Sync
                  </button>
                </div>
              </div>

              {/* Sync GMP */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "4px" }}>
                <div>
                  <h4 style={{ fontWeight: "600", fontSize: "14px" }}>Sync GMP Estimates</h4>
                  <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>Pulls grey market premiums from IPOGuru and InvestorGain.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>Status: {syncStatus.gmp}</span>
                  <button 
                    onClick={() => handleTriggerSync("gmp")}
                    className="btn" 
                    style={{ background: "var(--primary-navy)", color: "#fff", fontSize: "13px", cursor: "pointer" }}
                  >
                    Trigger Sync
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="card" style={{ padding: "20px", display: "grid", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              <div>
                <h3 style={{ fontSize: "18px", color: "var(--ink)" }}>Sync History & Health</h3>
                <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "2px" }}>Latest runs and detailed sync failure/success logs</p>
              </div>
              <button 
                onClick={loadLogs} 
                className="btn" 
                style={{ fontSize: "12px" }}
                disabled={loadingLogs}
              >
                {loadingLogs ? "Refreshing..." : "Refresh Logs"}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "10px" }}>Started At</th>
                    <th style={{ padding: "10px" }}>Finished At</th>
                    <th style={{ padding: "10px" }}>Provider / Scope</th>
                    <th style={{ padding: "10px" }}>Status</th>
                    <th style={{ padding: "10px" }}>Records Saved</th>
                    <th style={{ padding: "10px" }}>Details / Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
                        No logs recorded yet. Run a sync job to start logging.
                      </td>
                    </tr>
                  ) : (
                    syncLogs.map((log) => {
                      const isError = log.status === "error";
                      const isRunning = log.status === "running";
                      const dateStr = log.started_at ? new Date(log.started_at).toLocaleString() : "TBA";
                      const finishStr = log.finished_at ? new Date(log.finished_at).toLocaleTimeString() : (isRunning ? "Running..." : "TBA");
                      
                      return (
                        <tr key={log.id} style={{ borderBottom: "1px solid var(--border)", background: isError ? "#fef2f2" : "none" }}>
                          <td style={{ padding: "10px", whiteSpace: "nowrap" }}>{dateStr}</td>
                          <td style={{ padding: "10px", whiteSpace: "nowrap" }}>{finishStr}</td>
                          <td style={{ padding: "10px" }}>
                            <span style={{ fontWeight: "600" }}>{log.provider?.toUpperCase()}</span>
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>{log.data_type}</div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span 
                              style={{ 
                                padding: "2px 6px", 
                                fontSize: "10px", 
                                borderRadius: "4px",
                                background: isError ? "var(--red)" : isRunning ? "#fef3c7" : "var(--green)",
                                color: isError ? "#fff" : isRunning ? "#92400e" : "#fff",
                                fontWeight: "bold"
                              }}
                            >
                              {log.status?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "10px" }}>{log.records_saved !== null ? log.records_saved : "-"}</td>
                          <td style={{ padding: "10px", color: isError ? "var(--red)" : "var(--muted)", maxWidth: "300px", wordBreak: "break-all" }}>
                            {log.error_message || (isRunning ? "In progress..." : "Completed successfully.")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
