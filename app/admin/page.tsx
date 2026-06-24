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
  fetchSyncLogs,
  verifyAndLoginAdmin,
  logoutAdmin,
  checkAdminSession,
  sendBrevoCampaignAction,
  fetchSubscribersAction
} from "./actions";

const IPO_UPDATES_LIST_ID = "3";

export default function AdminPortal() {
  const [ipos, setIpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ipos" | "override" | "sync" | "logs" | "email" | "subscribers">("ipos");
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Email Marketing Tab States
  const [emailWebsiteUrl, setEmailWebsiteUrl] = useState("https://ipolens.co.in");
  const [emailSampleUrl, setEmailSampleUrl] = useState("");
  const [emailUnsubscribeUrl, setEmailUnsubscribeUrl] = useState("https://ipolens.co.in/unsubscribe");
  const [emailPrivacyUrl, setEmailPrivacyUrl] = useState("https://ipolens.co.in/privacy");
  const [emailTermsUrl, setEmailTermsUrl] = useState("https://ipolens.co.in/terms");
  const [emailSelectedIpoId, setEmailSelectedIpoId] = useState("");
  const [emailCopySuccess, setEmailCopySuccess] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<"announcement" | "upcoming" | "allotment" | "listing">("announcement");

  // Brevo marketing states
  const [brevoSubject, setBrevoSubject] = useState("");
  const [brevoListId, setBrevoListId] = useState(IPO_UPDATES_LIST_ID);
  const [brevoIsSending, setBrevoIsSending] = useState(false);
  const [brevoStatusMessage, setBrevoStatusMessage] = useState("");
  const [brevoStatusType, setBrevoStatusType] = useState<"success" | "error" | "">("");

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

  // Authentication States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPasswordConfigured, setIsPasswordConfigured] = useState(true);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  // Subscriber List States
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [subscribersIsMock, setSubscribersIsMock] = useState(false);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [subscribersError, setSubscribersError] = useState("");
  const [subscribersLimit] = useState(50);
  const [subscribersOffset, setSubscribersOffset] = useState(0);
  const [subscribersListId, setSubscribersListId] = useState(IPO_UPDATES_LIST_ID);

  async function loadSubscribers(offsetVal = subscribersOffset) {
    try {
      setLoadingSubscribers(true);
      setSubscribersError("");
      const res = await fetchSubscribersAction(subscribersLimit, offsetVal);
      if (res.success && res.data) {
        setSubscribers(res.data.contacts || []);
        setSubscribersCount(res.data.count || 0);
        setSubscribersListId(String(res.data.listId || IPO_UPDATES_LIST_ID));
        setSubscribersIsMock(Boolean(res.isMock));
      } else {
        setSubscribersError(res.error || "Failed to retrieve subscribers.");
      }
    } catch (err: any) {
      setSubscribersError(err.message || "Failed to retrieve subscribers.");
    } finally {
      setLoadingSubscribers(false);
    }
  }

  useEffect(() => {
    if (activeTab === "subscribers" && (isAuthenticated || !isPasswordConfigured)) {
      loadSubscribers(subscribersOffset);
    }
  }, [activeTab, subscribersOffset, isAuthenticated, isPasswordConfigured]);

  useEffect(() => {
    async function initAuth() {
      try {
        const { authenticated, configured } = await checkAdminSession();
        setIsAuthenticated(authenticated);
        setIsPasswordConfigured(configured);
        if (authenticated || !configured) {
          loadData();
          loadLogs();
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    }
    initAuth();
  }, []);

  useEffect(() => {
    // Default to ipolens.co.in as requested by user
    const defaultDomain = "https://ipolens.co.in";
    setEmailWebsiteUrl(defaultDomain);
    setEmailUnsubscribeUrl(`${defaultDomain}/unsubscribe`);
    setEmailPrivacyUrl(`${defaultDomain}/privacy`);
    setEmailTermsUrl(`${defaultDomain}/terms`);
  }, []);

  useEffect(() => {
    if (emailSelectedIpoId && ipos.length > 0) {
      const selectedIpo = ipos.find(i => i.id === emailSelectedIpoId);
      if (selectedIpo) {
        setEmailSampleUrl(`https://ipolens.co.in/ipo/${selectedIpo.slug}`);
      }
    }
  }, [emailSelectedIpoId, ipos]);

  useEffect(() => {
    if (emailSelectedIpoId && ipos.length > 0) {
      const selectedIpo = ipos.find(i => i.id === emailSelectedIpoId);
      if (selectedIpo) {
        let subject = "";
        switch (selectedTemplate) {
          case "announcement":
            subject = "Introducing IPO Lens: Smarter IPO Research & GMP Tracker";
            break;
          case "upcoming":
            subject = `Upcoming IPO Alert: ${selectedIpo.name} details & GMP inside!`;
            break;
          case "allotment":
            subject = `Allotment Status Out: Check status for ${selectedIpo.name}!`;
            break;
          case "listing":
            subject = `Listing Day Performance: ${selectedIpo.name} listing gains & analysis`;
            break;
        }
        setBrevoSubject(subject);
      }
    }
  }, [emailSelectedIpoId, selectedTemplate, ipos]);

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
      if (data.length > 0 && !emailSelectedIpoId) {
        setEmailSelectedIpoId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load admin IPOs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const success = await verifyAndLoginAdmin(authPassword);
      if (success) {
        setIsAuthenticated(true);
        loadData();
        loadLogs();
      } else {
        setAuthError("Incorrect password. Access denied.");
      }
    } catch (err) {
      setAuthError("An error occurred during login. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutAdmin();
      setIsAuthenticated(false);
      setAuthPassword("");
    } catch (err) {
      console.error("Logout failed:", err);
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

  const handleSendBrevoCampaign = async () => {
    if (!emailSelectedIpoId) {
      alert("Please select an IPO first.");
      return;
    }
    if (!brevoSubject.trim()) {
      alert("Please enter a subject line.");
      return;
    }

    const confirmSend = window.confirm(`Are you sure you want to send this campaign to Brevo IPO updates List #${brevoListId}?`);
    if (!confirmSend) return;

    setBrevoIsSending(true);
    setBrevoStatusMessage("");
    setBrevoStatusType("");

    try {
      const htmlContent = generateEmailHtml();
      const listId = parseInt(brevoListId, 10) || Number(IPO_UPDATES_LIST_ID);
      const res = await sendBrevoCampaignAction(brevoSubject, htmlContent, listId);

      if (res.success) {
        setBrevoStatusType("success");
        setBrevoStatusMessage("Campaign queued successfully in Brevo!");
      } else {
        setBrevoStatusType("error");
        setBrevoStatusMessage(res.error || "Failed to queue campaign.");
      }
    } catch (err: any) {
      setBrevoStatusType("error");
      setBrevoStatusMessage(err.message || "An unexpected error occurred.");
    } finally {
      setBrevoIsSending(false);
    }
  };

  function generateEmailHtml() {
    if (!emailSelectedIpoId || ipos.length === 0) {
      return "Please select an IPO to generate email template.";
    }

    const ipo = ipos.find(i => i.id === emailSelectedIpoId);
    if (!ipo) return "IPO not found.";

    // Sort gmp_history by captured_at descending to get latest
    const sortedGmp = ipo.gmp_history ? [...ipo.gmp_history].sort(
      (a: any, b: any) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
    ) : [];
    const latestGmpVal = sortedGmp[0]?.gmp_value;

    // Sort subscription_data by captured_at descending to get latest
    const sortedSub = ipo.subscription_data ? [...ipo.subscription_data].sort(
      (a: any, b: any) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
    ) : [];
    const latestSubVal = sortedSub[0]?.total_x;

    // Sort ai_analysis by generated_at descending to get latest
    const sortedAI = ipo.ai_analysis ? [...ipo.ai_analysis].sort(
      (a: any, b: any) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    ) : [];
    const latestAI = sortedAI[0];

    // Compute type
    const ipoType = ipo.category === "sme" ? "SME IPO" : "Mainboard IPO";

    // Compute exchange
    const exchange = ipo.enriched_data?.exchange || "NSE/BSE";

    // Compute issue size
    const issueSize = ipo.issue_size_cr ? `₹${ipo.issue_size_cr} Cr.` : "TBA";

    // Compute status
    let ipoStatus = "Upcoming";
    if (ipo.status === "open") ipoStatus = "Open Now";
    else if (ipo.status === "closed") ipoStatus = "Closed";
    else if (ipo.status === "listed") ipoStatus = "Listed";

    // Compute score
    const ipoScore = latestAI?.score ?? "TBA";

    // Compute signal
    const ipoSignal = latestAI?.label ?? "Neutral";

    // Compute GMP text with listing gain percentage if possible
    let gmpText = "TBA";
    if (latestGmpVal !== undefined && latestGmpVal !== null) {
      const price = ipo.price_band_high || ipo.price_band_low;
      if (price && price > 0) {
        const gain = ((latestGmpVal / price) * 100).toFixed(1);
        gmpText = `₹${latestGmpVal} (${gain}%)`;
      } else {
        gmpText = `₹${latestGmpVal}`;
      }
    }

    // Compute subscription
    const subscriptionText = latestSubVal !== undefined && latestSubVal !== null ? `${latestSubVal.toFixed(1)}x` : "TBA";

    // Compute price band
    let priceBandText = "TBA";
    if (ipo.price_band_low && ipo.price_band_high) {
      priceBandText = `₹${ipo.price_band_low} - ₹${ipo.price_band_high}`;
    } else if (ipo.price_band_high) {
      priceBandText = `₹${ipo.price_band_high}`;
    } else if (ipo.price_band_low) {
      priceBandText = `₹${ipo.price_band_low}`;
    }

    // Compute close date, open date, allotment date, listing date
    const closeDateText = ipo.close_date ? new Date(ipo.close_date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }) : "TBA";

    const openDateText = ipo.open_date ? new Date(ipo.open_date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }) : "TBA";

    const allotmentDateText = ipo.allotment_date ? new Date(ipo.allotment_date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }) : (ipo.enriched_data?.allotment_date ? new Date(ipo.enriched_data.allotment_date as string).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }) : "TBA");

    const listingDateText = ipo.listing_date ? new Date(ipo.listing_date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }) : "TBA";

    const lotSize = ipo.lot_size ? `${ipo.lot_size} Shares` : "TBA";
    const registrar = ipo.registrar_name || "TBA";
    const allotmentUrl = `${emailWebsiteUrl}/allotment`;
    const featuredIpoUrl = `${emailWebsiteUrl}/ipo/${ipo.slug}`;

    const listingPriceText = ipo.listing_price ? `₹${ipo.listing_price}` : "TBA";
    const listingGainText = ipo.listing_gain_pct !== null && ipo.listing_gain_pct !== undefined ? `${ipo.listing_gain_pct.toFixed(2)}%` : "TBA";

    // Select raw template based on dropdown state
    let rawTemplate = EMAIL_TEMPLATE_ANNOUNCEMENT;
    if (selectedTemplate === "upcoming") rawTemplate = EMAIL_TEMPLATE_UPCOMING;
    else if (selectedTemplate === "allotment") rawTemplate = EMAIL_TEMPLATE_ALLOTMENT;
    else if (selectedTemplate === "listing") rawTemplate = EMAIL_TEMPLATE_LISTING;

    // Replace placeholders
    let html = rawTemplate;
    html = html.replaceAll("{{website_url}}", emailWebsiteUrl || "");
    html = html.replaceAll("{{sample_analysis_url}}", emailSampleUrl || "");
    html = html.replaceAll("{{unsubscribe_url}}", emailUnsubscribeUrl || "");
    html = html.replaceAll("{{privacy_url}}", emailPrivacyUrl || "");
    html = html.replaceAll("{{terms_url}}", emailTermsUrl || "");
    html = html.replaceAll("{{featured_ipo_name}}", ipo.name || "");
    html = html.replaceAll("{{ipo_type}}", ipoType);
    html = html.replaceAll("{{exchange}}", exchange);
    html = html.replaceAll("{{issue_size}}", issueSize);
    html = html.replaceAll("{{ipo_status}}", ipoStatus);
    html = html.replaceAll("{{ipo_score}}", String(ipoScore));
    html = html.replaceAll("{{ipo_signal}}", ipoSignal);
    html = html.replaceAll("{{gmp}}", gmpText);
    html = html.replaceAll("{{subscription}}", subscriptionText);
    html = html.replaceAll("{{price_band}}", priceBandText);
    html = html.replaceAll("{{close_date}}", closeDateText);
    html = html.replaceAll("{{open_date}}", openDateText);
    html = html.replaceAll("{{allotment_date}}", allotmentDateText);
    html = html.replaceAll("{{listing_date}}", listingDateText);
    html = html.replaceAll("{{lot_size}}", lotSize);
    html = html.replaceAll("{{registrar}}", registrar);
    html = html.replaceAll("{{allotment_url}}", allotmentUrl);
    html = html.replaceAll("{{featured_ipo_url}}", featuredIpoUrl);
    html = html.replaceAll("{{listing_price}}", listingPriceText);
    html = html.replaceAll("{{listing_gain}}", listingGainText);

    return html;
  }

  if (checkingAuth) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ border: "4px solid rgba(0,0,0,0.1)", width: "36px", height: "36px", borderRadius: "50%", borderLeftColor: "var(--blue, #2563eb)", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#64748b", fontSize: "14px", fontWeight: "600" }}>Securing connection...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (isPasswordConfigured && !isAuthenticated) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 72px)", background: "var(--bg, #f8fafc)", padding: "24px 16px", fontFamily: "Inter, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: "420px", background: "#ffffff", borderRadius: "24px", border: "1px solid var(--line, #e2e8f0)", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)", padding: "36px 30px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <img src="/logo.png" alt="Logo" style={{ width: "48px", height: "48px", borderRadius: "12px", objectFit: "cover", margin: "0 auto 14px", display: "block" }} />
            <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 6px" }}>Admin Portal</h1>
            <p style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", margin: 0 }}>Please enter the password to gain access</p>
          </div>
          
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label htmlFor="admin-password" style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
              <input
                id="admin-password"
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                style={{ height: "46px", padding: "0 14px", border: "1px solid var(--line, #e2e8f0)", borderRadius: "12px", fontSize: "15px", outline: "none", width: "100%", transition: "all 150ms ease" }}
                className="login-input"
              />
            </div>
            
            {authError && (
              <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: "600", padding: "10px 12px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca", textAlign: "center" }}>
                {authError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loggingIn}
              style={{ height: "46px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "800", cursor: "pointer", transition: "all 150ms ease", opacity: loggingIn ? 0.7 : 1 }}
            >
              {loggingIn ? "Verifying..." : "Authenticate Access →"}
            </button>
          </form>
          
          <div style={{ textAlign: "center", marginTop: "32px", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: "18px" }}>
            <Link href="/" style={{ color: "#2563eb", fontSize: "12px", fontWeight: "700", textDecoration: "none" }}>
              ← Return to Homepage
            </Link>
          </div>
        </div>
        <style>{`
          .login-input:focus {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
          }
        `}</style>
      </div>
    );
  }

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
        {!isPasswordConfigured && (
          <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "flex", gap: "12px", alignItems: "flex-start", color: "#b45309" }}>
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <div>
              <strong style={{ display: "block", fontSize: "14px", fontWeight: "850" }}>Security Alert: Admin Panel is Publicly Accessible</strong>
              <span style={{ fontSize: "13px", fontWeight: "600", marginTop: "2px", display: "block" }}>
                Set the <code>ADMIN_PASSWORD</code> environment variable in your Vercel deployment (or local <code>.env.local</code>) to secure this portal.
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "var(--ink)" }}>Admin Portal</h1>
            <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "4px" }}>Manage IPO Lens metadata, manual overrides, and sync operations</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {isPasswordConfigured && isAuthenticated && (
              <button onClick={handleLogout} className="btn btn-secondary" style={{ fontSize: "13px", color: "#ef4444", borderColor: "#fca5a5", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}>
                Logout
              </button>
            )}
            <Link href="/" className="btn" style={{ fontSize: "13px" }}>
              ← Live Dashboard
            </Link>
          </div>
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
            <button 
              className={`btn ${activeTab === "email" ? "" : "btn-secondary"}`}
              onClick={() => setActiveTab("email")}
              style={{ padding: "6px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              Email Marketing
            </button>
            <button 
              className={`btn ${activeTab === "subscribers" ? "" : "btn-secondary"}`}
              onClick={() => setActiveTab("subscribers")}
              style={{ padding: "6px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
            >
              Subscribers
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

        {/* Tab 5: Email Marketing */}
        {activeTab === "email" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>
              
              {/* Left Side: Controls */}
              <div className="card" style={{ padding: "20px", display: "grid", gap: "16px" }}>
                <h3 style={{ fontSize: "18px", color: "var(--ink)", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                  Email Generator
                </h3>
                
                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Select Featured IPO</label>
                  <select 
                    value={emailSelectedIpoId} 
                    onChange={(e) => setEmailSelectedIpoId(e.target.value)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", background: "var(--card-bg)" }}
                    required
                  >
                    <option value="">-- Select an IPO --</option>
                    {ipos.map(ipo => (
                      <option key={ipo.id} value={ipo.id}>{ipo.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Select Template Type</label>
                  <select 
                    value={selectedTemplate} 
                    onChange={(e) => setSelectedTemplate(e.target.value as any)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", background: "var(--card-bg)" }}
                  >
                    <option value="announcement">Brand Announcement (Introduction)</option>
                    <option value="upcoming">Upcoming IPO Alert</option>
                    <option value="allotment">Allotment Status Out</option>
                    <option value="listing">Listing Day Performance</option>
                  </select>
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Website URL Fallback</label>
                  <input 
                    type="url" 
                    value={emailWebsiteUrl}
                    onChange={(e) => setEmailWebsiteUrl(e.target.value)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Sample Analysis URL</label>
                  <input 
                    type="url" 
                    value={emailSampleUrl}
                    onChange={(e) => setEmailSampleUrl(e.target.value)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Unsubscribe URL</label>
                  <input 
                    type="url" 
                    value={emailUnsubscribeUrl}
                    onChange={(e) => setEmailUnsubscribeUrl(e.target.value)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Privacy Policy URL</label>
                  <input 
                    type="url" 
                    value={emailPrivacyUrl}
                    onChange={(e) => setEmailPrivacyUrl(e.target.value)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Terms & Conditions URL</label>
                  <input 
                    type="url" 
                    value={emailTermsUrl}
                    onChange={(e) => setEmailTermsUrl(e.target.value)}
                    style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%" }}
                  />
                </div>

                <button 
                  onClick={async () => {
                    const htmlContent = generateEmailHtml();
                    try {
                      await navigator.clipboard.writeText(htmlContent);
                      setEmailCopySuccess(true);
                      setTimeout(() => setEmailCopySuccess(false), 2000);
                    } catch (err) {
                      alert("Failed to copy HTML code to clipboard");
                    }
                  }}
                  className="btn" 
                  style={{ 
                    background: "var(--primary-navy)", 
                    color: "#fff", 
                    padding: "10px", 
                    marginTop: "8px", 
                    cursor: "pointer", 
                    border: "none",
                    fontWeight: "600"
                  }}
                  disabled={!emailSelectedIpoId}
                >
                  {emailCopySuccess ? "✓ Copied to Clipboard!" : "Copy HTML Code"}
                </button>

                {/* Brevo Campaign Sender Block */}
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "grid", gap: "12px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--ink)", margin: 0 }}>
                    Send via Brevo API
                  </h4>
                  
                  <div style={{ display: "grid", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)" }}>Email Subject Line</label>
                    <input 
                      type="text" 
                      value={brevoSubject}
                      onChange={(e) => setBrevoSubject(e.target.value)}
                      placeholder="Enter campaign subject line"
                      style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", fontSize: "13px" }}
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted)" }}>Brevo Contact List ID (IPO updates)</label>
                    <input 
                      type="number" 
                      value={brevoListId}
                      onChange={(e) => setBrevoListId(e.target.value)}
                      placeholder="3"
                      style={{ padding: "8px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", fontSize: "13px" }}
                      required
                    />
                  </div>

                  <button 
                    onClick={handleSendBrevoCampaign}
                    className="btn" 
                    style={{ 
                      background: "#00C48C", 
                      color: "#fff", 
                      padding: "10px", 
                      cursor: "pointer", 
                      border: "none",
                      fontWeight: "600",
                      borderColor: "#00C48C",
                      opacity: brevoIsSending ? 0.7 : 1
                    }}
                    disabled={brevoIsSending || !emailSelectedIpoId}
                  >
                    {brevoIsSending ? "Sending Campaign..." : "Send Brevo Campaign"}
                  </button>

                  {brevoStatusMessage && (
                    <div style={{ 
                      color: brevoStatusType === "success" ? "#00C48C" : "#ef4444", 
                      fontSize: "12px", 
                      fontWeight: "600", 
                      padding: "8px 10px", 
                      background: brevoStatusType === "success" ? "#ecfdf5" : "#fef2f2", 
                      borderRadius: "6px", 
                      border: `1px solid ${brevoStatusType === "success" ? "#a7f3d0" : "#fecaca"}` 
                    }}>
                      {brevoStatusMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Live Preview IFrame */}
              <div className="card" style={{ padding: "20px", display: "grid", gap: "16px" }}>
                <h3 style={{ fontSize: "18px", color: "var(--ink)", borderBottom: "1px solid var(--border)", paddingBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Live Preview (Email Client Simulation)</span>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "normal" }}>680px Width Layout</span>
                </h3>
                
                <div style={{ background: "#f1f5f9", borderRadius: "12px", padding: "16px", border: "1px solid var(--border)", overflow: "hidden", height: "650px", display: "flex", justifyContent: "center" }}>
                  <iframe
                    title="Email Preview"
                    srcDoc={generateEmailHtml()}
                    style={{
                      width: "100%",
                      maxWidth: "680px",
                      height: "100%",
                      border: "1px solid #e5eaf2",
                      borderRadius: "8px",
                      background: "#ffffff",
                      boxShadow: "0 4px 12px rgba(15,23,42,0.05)"
                    }}
                  />
                </div>
              </div>

            </div>

            {/* Collapsible/Viewable HTML Code Area */}
            <div className="card" style={{ padding: "20px", display: "grid", gap: "12px" }}>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: "600", fontSize: "14px", color: "var(--ink)" }}>
                  View Generated HTML Source Code
                </summary>
                <div style={{ marginTop: "12px" }}>
                  <textarea
                    readOnly
                    value={generateEmailHtml()}
                    style={{
                      width: "100%",
                      height: "300px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      padding: "12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--card-bg)",
                      color: "var(--ink)",
                      resize: "vertical"
                    }}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                    Tip: Click inside the box to automatically select all text.
                  </p>
                </div>
              </details>
            </div>
            
          </div>
        )}

        {/* Tab 6: Subscribers List */}
        {activeTab === "subscribers" && (
          <div className="card" style={{ padding: "20px", display: "grid", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "18px", color: "var(--ink)", margin: 0 }}>IPO Updates Subscribers</h3>
                <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
                  Contacts collected from the website email update forms in Brevo List #{subscribersListId}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  className="btn btn-secondary"
                  disabled={loadingSubscribers}
                  onClick={() => {
                    setSubscribersOffset(0);
                    loadSubscribers(0);
                  }}
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                  type="button"
                >
                  Refresh
                </button>
                <div style={{ background: "var(--blue-soft)", color: "var(--blue)", padding: "6px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "700" }}>
                  List #{subscribersListId} • {subscribersCount} Contacts
                </div>
              </div>
            </div>

            {subscribersIsMock && (
              <div style={{ background: "var(--blue-soft)", border: "1px solid rgba(37, 99, 255, 0.2)", color: "#1e3a8a", padding: "12px 16px", borderRadius: "8px", display: "flex", gap: "10px", alignItems: "center", fontSize: "13px" }}>
                <span style={{ fontSize: "16px" }}>ℹ️</span>
                <span><strong>Developer Mode:</strong> Brevo API key is not configured. Showing sample subscribers for List #{subscribersListId}.</span>
              </div>
            )}

            {subscribersError && (
              <div style={{ background: "var(--red-soft)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--red)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px" }}>
                ⚠️ {subscribersError}
              </div>
            )}

            {loadingSubscribers ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                <div className="spinner" style={{ border: "3px solid rgba(0,0,0,0.05)", width: "24px", height: "24px", borderRadius: "50%", borderLeftColor: "var(--blue)", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                <span>Loading subscribers...</span>
              </div>
            ) : subscribers.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "8px" }}>
                No subscribers found in Brevo List #{subscribersListId}.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "10px", width: "80px" }}>ID</th>
                      <th style={{ padding: "10px" }}>Email Address</th>
                      <th style={{ padding: "10px", width: "200px" }}>Joined On</th>
                      <th style={{ padding: "10px", width: "120px", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((contact: any) => (
                      <tr key={contact.id} style={{ borderBottom: "1px solid var(--border)", height: "46px" }}>
                        <td style={{ padding: "10px", color: "var(--muted)" }} className="mono">{contact.id}</td>
                        <td style={{ padding: "10px", fontWeight: "600", color: "var(--ink)" }}>{contact.email}</td>
                        <td style={{ padding: "10px", color: "var(--text)" }} className="mono">
                          {contact.createdAt ? new Date(contact.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "-"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <span 
                            style={{ 
                              background: contact.emailBlacklisted ? "var(--red-soft)" : "var(--green-soft)", 
                              color: contact.emailBlacklisted ? "var(--red)" : "var(--green)", 
                              padding: "4px 8px", 
                              borderRadius: "12px", 
                              fontSize: "11px", 
                              fontWeight: "700",
                              display: "inline-block"
                            }}
                          >
                            {contact.emailBlacklisted ? "BOUNCED" : "SUBSCRIBED"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Showing {subscribersOffset + 1} to {subscribersOffset + subscribers.length} of {subscribersCount} subscribers
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn btn-secondary"
                      disabled={subscribersOffset === 0}
                      onClick={() => setSubscribersOffset(Math.max(0, subscribersOffset - subscribersLimit))}
                      style={{ padding: "6px 12px", fontSize: "12px", cursor: subscribersOffset === 0 ? "not-allowed" : "pointer" }}
                    >
                      ← Previous
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={subscribersOffset + subscribers.length >= subscribersCount}
                      onClick={() => setSubscribersOffset(subscribersOffset + subscribersLimit)}
                      style={{ padding: "6px 12px", fontSize: "12px", cursor: subscribersOffset + subscribers.length >= subscribersCount ? "not-allowed" : "pointer" }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const EMAIL_TEMPLATE_ANNOUNCEMENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPO Lens Brand Announcement</title>
</head>

<body style="margin:0; padding:0; background:#f5f7fb; font-family:Inter, Arial, sans-serif; color:#0b132b;">

  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    IPO Lens helps retail investors research IPOs with score, GMP, subscription, risks and AI summaries.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb; padding:28px 0;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="680" cellpadding="0" cellspacing="0" style="width:680px; max-width:94%; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e5eaf2; box-shadow:0 18px 55px rgba(15,23,42,0.08);">

          <!-- Dark Market Strip -->
          <tr>
            <td style="background:#071225; padding:11px 26px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px; color:#ffffff; font-weight:700; letter-spacing:0.2px;">
                    IPO WATCH
                  </td>
                  <td align="right" style="font-size:12px; color:#9fb0c8;">
                    GMP • Subscription • IPO Score • AI Research
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:30px 34px 12px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <!-- Premium Logo -->
                          <img src="{{website_url}}/logo.png" alt="IPO Lens Logo" style="width:42px; height:42px; border-radius:12px; display:block; object-fit:cover;" />
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:24px; font-weight:900; color:#071225; letter-spacing:-0.5px;">
                            IPO Lens
                          </div>
                          <div style="font-size:13px; color:#64748b; margin-top:2px;">
                            Smarter IPO Research
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <a href="{{website_url}}" style="background:#071225; color:#ffffff; padding:12px 18px; border-radius:12px; text-decoration:none; font-size:14px; font-weight:800; display:inline-block;">
                      Explore IPOs →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td style="padding:18px 34px 28px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8fbff 0%,#eef5ff 52%,#ecfdf5 100%); border:1px solid #dbeafe; border-radius:22px;">
                <tr>
                  <td style="padding:34px 30px;">
                    <div style="display:inline-block; background:#ffffff; border:1px solid #dbeafe; border-radius:999px; padding:8px 13px; color:#2563eb; font-size:12px; font-weight:800; margin-bottom:18px;">
                      New platform announcement
                    </div>

                    <h1 style="font-size:38px; line-height:1.05; margin:0; color:#071225; letter-spacing:-1.5px; font-weight:950;">
                      IPO research that feels less like hype and more like homework.
                    </h1>

                    <p style="font-size:16px; line-height:1.7; color:#475569; margin:18px 0 24px 0; max-width:560px;">
                      IPO Lens brings GMP, subscription demand, issue details, financials, valuation, risk signals and AI-powered plain-English summaries into one clean research view for Indian retail investors.
                    </p>

                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <a href="{{website_url}}" style="background:#2563eb; color:#ffffff; padding:14px 22px; border-radius:12px; text-decoration:none; font-size:15px; font-weight:900; display:inline-block;">
                            Start Researching IPOs →
                          </a>
                        </td>
                        <td style="padding-left:12px;">
                          <a href="{{sample_analysis_url}}" style="background:#ffffff; color:#071225; padding:13px 20px; border-radius:12px; text-decoration:none; font-size:15px; font-weight:800; display:inline-block; border:1px solid #cbd5e1;">
                            View Sample Analysis
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Feature Chips -->
          <tr>
            <td style="padding:0 34px 26px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="25%" style="padding:6px;">
                    <div style="background:#ffffff; border:1px solid #e5eaf2; border-radius:16px; padding:16px 12px; text-align:center;">
                      <div style="font-size:24px;">📊</div>
                      <div style="font-size:13px; font-weight:850; color:#071225; margin-top:8px;">IPO Score</div>
                      <div style="font-size:11px; color:#64748b; margin-top:4px; line-height:1.4;">Rule-based signal</div>
                    </div>
                  </td>

                  <td width="25%" style="padding:6px;">
                    <div style="background:#ffffff; border:1px solid #e5eaf2; border-radius:16px; padding:16px 12px; text-align:center;">
                      <div style="font-size:24px;">📈</div>
                      <div style="font-size:13px; font-weight:850; color:#071225; margin-top:8px;">GMP Tracking</div>
                      <div style="font-size:11px; color:#64748b; margin-top:4px; line-height:1.4;">Market sentiment</div>
                    </div>
                  </td>

                  <td width="25%" style="padding:6px;">
                    <div style="background:#ffffff; border:1px solid #e5eaf2; border-radius:16px; padding:16px 12px; text-align:center;">
                      <div style="font-size:24px;">🤖</div>
                      <div style="font-size:13px; font-weight:850; color:#071225; margin-top:8px;">AI Summary</div>
                      <div style="font-size:11px; color:#64748b; margin-top:4px; line-height:1.4;">Simple English</div>
                    </div>
                  </td>

                  <td width="25%" style="padding:6px;">
                    <div style="background:#ffffff; border:1px solid #e5eaf2; border-radius:16px; padding:16px 12px; text-align:center;">
                      <div style="font-size:24px;">⚠️</div>
                      <div style="font-size:13px; font-weight:850; color:#071225; margin-top:8px;">Risk View</div>
                      <div style="font-size:11px; color:#64748b; margin-top:4px; line-height:1.4;">Before applying</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Featured IPO Card -->
          <tr>
            <td style="padding:0 34px 28px 34px;">
              <div style="font-size:18px; font-weight:900; color:#071225; margin-bottom:12px;">
                What an IPO Lens research card looks like
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5eaf2; border-radius:20px; overflow:hidden; background:#ffffff;">
                <tr>
                  <td style="padding:20px 22px; border-bottom:1px solid #e5eaf2;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="font-size:20px; font-weight:950; color:#071225;">
                            {{featured_ipo_name}}
                          </div>
                          <div style="font-size:13px; color:#64748b; margin-top:5px;">
                            {{ipo_type}} • {{exchange}} • {{issue_size}} issue
                          </div>
                        </td>
                        <td align="right">
                          <span style="background:#ecfdf5; color:#059669; padding:7px 11px; border-radius:999px; font-size:12px; font-weight:900;">
                            {{ipo_status}}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:22px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="35%" style="border-right:1px solid #e5eaf2; padding-right:20px;">
                          <div style="font-size:12px; color:#64748b; font-weight:700;">
                            IPO Lens Score
                          </div>
                          <div style="font-size:42px; line-height:1; color:#10b981; font-weight:950; margin-top:6px;">
                            {{ipo_score}}<span style="font-size:18px; color:#64748b;">/100</span>
                          </div>
                          <div style="font-size:16px; color:#059669; font-weight:900; margin-top:7px;">
                            {{ipo_signal}}
                          </div>
                        </td>

                        <td width="65%" style="padding-left:22px;">
                          <div style="font-size:13px; color:#071225; font-weight:850; margin-bottom:10px;">
                            Why investors may track it
                          </div>

                          <div style="font-size:13px; color:#334155; line-height:1.65;">
                            ✓ GMP and subscription data in one place<br/>
                            ✓ Plain-English business summary<br/>
                            ✓ Financial and valuation snapshot<br/>
                            ⚠ Risk signals before applying
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 22px 22px 22px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border:1px solid #e5eaf2; border-radius:14px 0 0 14px; padding:13px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">GMP</div>
                          <div style="font-size:16px; color:#071225; font-weight:950; margin-top:4px;">{{gmp}}</div>
                        </td>
                        <td style="border-top:1px solid #e5eaf2; border-bottom:1px solid #e5eaf2; border-right:1px solid #e5eaf2; padding:13px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">Subscription</div>
                          <div style="font-size:16px; color:#071225; font-weight:950; margin-top:4px;">{{subscription}}</div>
                        </td>
                        <td style="border-top:1px solid #e5eaf2; border-bottom:1px solid #e5eaf2; border-right:1px solid #e5eaf2; padding:13px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">Price Band</div>
                          <div style="font-size:16px; color:#071225; font-weight:950; margin-top:4px;">{{price_band}}</div>
                        </td>
                        <td style="border-top:1px solid #e5eaf2; border-bottom:1px solid #e5eaf2; border-right:1px solid #e5eaf2; border-radius:0 14px 14px 0; padding:13px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">Closes On</div>
                          <div style="font-size:16px; color:#071225; font-weight:950; margin-top:4px;">{{close_date}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="background:#f8fbff; padding:16px 22px; border-top:1px solid #e5eaf2;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px; color:#475569; line-height:1.5;">
                          <strong style="color:#071225;">Plain-English view:</strong>
                          IPO Lens explains what the company does, why the IPO is getting attention, and what beginners should watch out for.
                        </td>
                        <td align="right">
                          <a href="{{featured_ipo_url}}" style="color:#2563eb; font-size:13px; font-weight:900; text-decoration:none;">
                            View full analysis →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Problem / Solution -->
          <tr>
            <td style="padding:0 34px 30px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#071225; border-radius:22px; overflow:hidden;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="font-size:24px; line-height:1.2; color:#ffffff; margin:0; font-weight:950;">
                      Built for investors who want clarity before applying.
                    </h2>

                    <p style="font-size:14px; color:#cbd5e1; line-height:1.7; margin:14px 0 20px 0;">
                      IPO Lens helps you move from scattered IPO updates to a cleaner, research-first view.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding:8px;">
                          <div style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:16px;">
                            <div style="font-size:13px; color:#93c5fd; font-weight:900;">Before IPO Lens</div>
                            <div style="font-size:13px; color:#e2e8f0; line-height:1.6; margin-top:8px;">
                              Multiple websites, scattered GMP updates, long DRHPs, confusing risk factors.
                            </div>
                          </div>
                        </td>

                        <td width="50%" style="padding:8px;">
                          <div style="background:rgba(16,185,129,0.13); border:1px solid rgba(16,185,129,0.35); border-radius:16px; padding:16px;">
                            <div style="font-size:13px; color:#6ee7b7; font-weight:900;">With IPO Lens</div>
                            <div style="font-size:13px; color:#e2e8f0; line-height:1.6; margin-top:8px;">
                              Score, GMP, subscription, financials, risks and simple AI summaries in one place.
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:4px 34px 36px 34px;">
              <h2 style="font-size:25px; line-height:1.2; color:#071225; margin:0; font-weight:950;">
                Research your next IPO in minutes.
              </h2>

              <p style="font-size:14px; color:#64748b; line-height:1.6; margin:12px 0 22px 0;">
                Explore live IPOs, upcoming issues, strong data signals and simple analysis.
              </p>

              <a href="{{website_url}}" style="background:#2563eb; color:#ffffff; padding:15px 28px; border-radius:14px; text-decoration:none; font-size:15px; font-weight:950; display:inline-block;">
                Explore IPO Lens →
              </a>
            </td>
          </tr>

          <!-- Compliance Footer -->
          <tr>
            <td style="background:#f8fafc; padding:22px 34px; border-top:1px solid #e5eaf2;">
              <p style="font-size:11px; line-height:1.65; color:#64748b; margin:0;">
                <strong>Disclaimer:</strong> IPO Lens is for educational and informational purposes only. We do not provide investment advice, IPO recommendations, buy/sell/hold calls, or guarantees of listing gains. IPO investments are subject to market risks. GMP is unofficial, unregulated and not guaranteed. Please read the DRHP/RHP and consult a qualified financial advisor before investing.
              </p>

              <p style="font-size:11px; line-height:1.6; color:#94a3b8; margin:16px 0 0 0;">
                You are receiving this email because you subscribed to IPO Lens updates.  
                <a href="{{unsubscribe_url}}" style="color:#64748b; text-decoration:underline;">Unsubscribe</a> •
                <a href="{{privacy_url}}" style="color:#64748b; text-decoration:underline;">Privacy Policy</a> •
                <a href="{{terms_url}}" style="color:#64748b; text-decoration:underline;">Terms</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

const EMAIL_TEMPLATE_UPCOMING = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Upcoming IPO Alert: {{featured_ipo_name}}</title>
</head>
<body style="margin:0; padding:0; background:#f5f7fb; font-family:Inter, Arial, sans-serif; color:#0b132b;">
  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    New IPO Alert: {{featured_ipo_name}} opening soon. Price band: {{price_band}}, issue size: {{issue_size}}. Read AI summary.
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb; padding:28px 0;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="width:680px; max-width:94%; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e5eaf2; box-shadow:0 18px 55px rgba(15,23,42,0.08);">
          <!-- Top Accent strip -->
          <tr>
            <td style="background:#2563eb; padding:11px 26px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px; color:#ffffff; font-weight:700; letter-spacing:0.2px;">
                    UPCOMING IPO ALERT
                  </td>
                  <td align="right" style="font-size:12px; color:#dbeafe;">
                    Opens on {{open_date}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding:30px 34px 12px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <!-- Premium Logo -->
                          <img src="{{website_url}}/logo.png" alt="IPO Lens Logo" style="width:42px; height:42px; border-radius:12px; display:block; object-fit:cover;" />
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:24px; font-weight:900; color:#071225; letter-spacing:-0.5px;">
                            IPO Lens
                          </div>
                          <div style="font-size:13px; color:#64748b; margin-top:2px;">
                            Smarter IPO Research
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <a href="{{featured_ipo_url}}" style="background:#071225; color:#ffffff; padding:12px 18px; border-radius:12px; text-decoration:none; font-size:14px; font-weight:800; display:inline-block;">
                      View Analysis →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Hero Section -->
          <tr>
            <td style="padding:18px 34px 28px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8fbff 0%,#eff6ff 100%); border:1px solid #dbeafe; border-radius:22px;">
                <tr>
                  <td style="padding:34px 30px;">
                    <div style="display:inline-block; background:#ffffff; border:1px solid #2563eb; border-radius:999px; padding:6px 13px; color:#2563eb; font-size:11px; font-weight:800; margin-bottom:18px;">
                      OPENS SOON
                    </div>
                    <h1 style="font-size:36px; line-height:1.1; margin:0; color:#071225; letter-spacing:-1px; font-weight:950;">
                      {{featured_ipo_name}}
                    </h1>
                    <p style="font-size:15px; line-height:1.6; color:#475569; margin:16px 0 24px 0; max-width:560px;">
                      The subscription window for this {{ipo_type}} is opening soon. Here is a high-level summary of the issue size, price band, and current market premium.
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <a href="{{featured_ipo_url}}" style="background:#2563eb; color:#ffffff; padding:14px 22px; border-radius:12px; text-decoration:none; font-size:15px; font-weight:900; display:inline-block;">
                            See Full AI Scorecard →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Table of Key Metrics -->
          <tr>
            <td style="padding:0 34px 28px 34px;">
              <div style="font-size:18px; font-weight:900; color:#071225; margin-bottom:16px;">
                IPO Details & Market Sentiment
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5eaf2; border-radius:20px; overflow:hidden; background:#ffffff;">
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid #e5eaf2; background:#f8fafc;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px; color:#64748b; font-weight:700;">IPO Rating / Score</td>
                        <td align="right" style="font-size:16px; color:#059669; font-weight:900;">
                          {{ipo_score}} <span style="font-size:12px; color:#64748b;">/ 100</span> ({{ipo_signal}})
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding-bottom:16px; border-bottom:1px solid #f1f5f9; border-right:1px solid #f1f5f9; padding-right:12px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">PRICE BAND</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{price_band}}</div>
                        </td>
                        <td width="50%" style="padding-bottom:16px; border-bottom:1px solid #f1f5f9; padding-left:20px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">ISSUE SIZE</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{issue_size}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-top:16px; border-right:1px solid #f1f5f9; padding-right:12px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">GMP (GREY MARKET PREMIUM)</div>
                          <div style="font-size:18px; color:#2563eb; font-weight:900; margin-top:4px;">{{gmp}}</div>
                        </td>
                        <td width="50%" style="padding-top:16px; padding-left:20px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">LOT SIZE</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{lot_size}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px; border-top:1px solid #e5eaf2; background:#f8fbff;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:12px; color:#475569;">
                          <strong>Key Dates:</strong> Opens on <strong>{{open_date}}</strong> and closes on <strong>{{close_date}}</strong>.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Call to Action -->
          <tr>
            <td align="center" style="padding:10px 34px 40px 34px;">
              <h2 style="font-size:24px; line-height:1.2; color:#071225; margin:0; font-weight:950;">
                Get the complete research view.
              </h2>
              <p style="font-size:14px; color:#64748b; line-height:1.6; margin:12px 0 22px 0; max-width:480px;">
                Log in to check financial health metrics, valuation summaries, promoter holdings, and AI-driven safety ratings.
              </p>
              <a href="{{featured_ipo_url}}" style="background:#071225; color:#ffffff; padding:15px 28px; border-radius:14px; text-decoration:none; font-size:15px; font-weight:950; display:inline-block;">
                Unlock Full Analysis →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:22px 34px; border-top:1px solid #e5eaf2;">
              <p style="font-size:11px; line-height:1.65; color:#64748b; margin:0;">
                <strong>Disclaimer:</strong> IPO Lens is for educational and informational purposes only. We do not provide investment advice, IPO recommendations, buy/sell/hold calls, or guarantees of listing gains. IPO investments are subject to market risks. GMP is unofficial, unregulated and not guaranteed. Please read the DRHP/RHP and consult a qualified financial advisor before investing.
              </p>
              <p style="font-size:11px; line-height:1.6; color:#94a3b8; margin:16px 0 0 0;">
                You are receiving this email because you subscribed to IPO Lens updates.  
                <a href="{{unsubscribe_url}}" style="color:#64748b; text-decoration:underline;">Unsubscribe</a> •
                <a href="{{privacy_url}}" style="color:#64748b; text-decoration:underline;">Privacy Policy</a> •
                <a href="{{terms_url}}" style="color:#64748b; text-decoration:underline;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const EMAIL_TEMPLATE_ALLOTMENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Allotment Out: {{featured_ipo_name}}</title>
</head>
<body style="margin:0; padding:0; background:#f5f7fb; font-family:Inter, Arial, sans-serif; color:#0b132b;">
  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    The allotment status for {{featured_ipo_name}} is now live. Check your allocation status online.
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb; padding:28px 0;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="width:680px; max-width:94%; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e5eaf2; box-shadow:0 18px 55px rgba(15,23,42,0.08);">
          <!-- Top Accent strip -->
          <tr>
            <td style="background:#059669; padding:11px 26px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px; color:#ffffff; font-weight:700; letter-spacing:0.2px;">
                    ALLOTMENT STATUS ANNOUNCEMENT
                  </td>
                  <td align="right" style="font-size:12px; color:#d1fae5;">
                    Subscription: {{subscription}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding:30px 34px 12px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <!-- Premium Logo -->
                          <img src="{{website_url}}/logo.png" alt="IPO Lens Logo" style="width:42px; height:42px; border-radius:12px; display:block; object-fit:cover;" />
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:24px; font-weight:900; color:#071225; letter-spacing:-0.5px;">
                            IPO Lens
                          </div>
                          <div style="font-size:13px; color:#64748b; margin-top:2px;">
                            Smarter IPO Research
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <a href="{{allotment_url}}" style="background:#059669; color:#ffffff; padding:12px 18px; border-radius:12px; text-decoration:none; font-size:14px; font-weight:800; display:inline-block;">
                      Check Allotment →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Hero Section -->
          <tr>
            <td style="padding:18px 34px 28px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%); border:1px solid #a7f3d0; border-radius:22px;">
                <tr>
                  <td style="padding:34px 30px;">
                    <div style="display:inline-block; background:#ffffff; border:1px solid #059669; border-radius:999px; padding:6px 13px; color:#059669; font-size:11px; font-weight:800; margin-bottom:18px;">
                      ALLOTMENT ACTIVE
                    </div>
                    <h1 style="font-size:36px; line-height:1.1; margin:0; color:#071225; letter-spacing:-1px; font-weight:950;">
                      {{featured_ipo_name}} Allotment Status is Out
                    </h1>
                    <p style="font-size:15px; line-height:1.6; color:#374151; margin:16px 0 24px 0; max-width:560px;">
                      Registrars have finalized the share allotment details. You can check your application allotment status using your PAN card, Application number, or DP ID.
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <a href="{{allotment_url}}" style="background:#059669; color:#ffffff; padding:14px 22px; border-radius:12px; text-decoration:none; font-size:15px; font-weight:900; display:inline-block;">
                            Check My Allotment Status →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Info Details -->
          <tr>
            <td style="padding:0 34px 28px 34px;">
              <div style="font-size:18px; font-weight:900; color:#071225; margin-bottom:16px;">
                Allotment Summary & Estimates
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5eaf2; border-radius:20px; overflow:hidden; background:#ffffff;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding-bottom:16px; border-bottom:1px solid #f1f5f9; border-right:1px solid #f1f5f9; padding-right:12px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">TOTAL SUBSCRIPTION</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{subscription}}</div>
                        </td>
                        <td width="50%" style="padding-bottom:16px; border-bottom:1px solid #f1f5f9; padding-left:20px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">CURRENT GMP PREVIEW</div>
                          <div style="font-size:18px; color:#059669; font-weight:900; margin-top:4px;">{{gmp}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-top:16px; border-right:1px solid #f1f5f9; padding-right:12px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">ALLOTMENT DATE</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{allotment_date}}</div>
                        </td>
                        <td width="50%" style="padding-top:16px; padding-left:20px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">REGISTRAR</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{registrar}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- How to check card -->
          <tr>
            <td style="padding:0 34px 28px 34px;">
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:18px; padding:22px 24px;">
                <h3 style="font-size:15px; color:#0f172a; margin:0 0 8px 0; font-weight:800;">
                  How to check allocation online:
                </h3>
                <ol style="font-size:13px; color:#4b5563; line-height:1.6; margin:0; padding-left:20px;">
                  <li>Click the green <strong>Check Allotment</strong> button above.</li>
                  <li>Select <strong>{{featured_ipo_name}}</strong> from the dropdown list.</li>
                  <li>Provide your PAN Number, DP ID, or Application Number.</li>
                  <li>Click <strong>Submit</strong> to view allotted shares and refund timelines.</li>
                </ol>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:22px 34px; border-top:1px solid #e5eaf2;">
              <p style="font-size:11px; line-height:1.65; color:#64748b; margin:0;">
                <strong>Disclaimer:</strong> IPO Lens is for educational and informational purposes only. We do not provide investment advice, IPO recommendations, buy/sell/hold calls, or guarantees of listing gains. IPO investments are subject to market risks. GMP is unofficial, unregulated and not guaranteed. Please read the DRHP/RHP and consult a qualified financial advisor before investing.
              </p>
              <p style="font-size:11px; line-height:1.6; color:#94a3b8; margin:16px 0 0 0;">
                You are receiving this email because you subscribed to IPO Lens updates.  
                <a href="{{unsubscribe_url}}" style="color:#64748b; text-decoration:underline;">Unsubscribe</a> •
                <a href="{{privacy_url}}" style="color:#64748b; text-decoration:underline;">Privacy Policy</a> •
                <a href="{{terms_url}}" style="color:#64748b; text-decoration:underline;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const EMAIL_TEMPLATE_LISTING = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Listing Debut: {{featured_ipo_name}}</title>
</head>
<body style="margin:0; padding:0; background:#f5f7fb; font-family:Inter, Arial, sans-serif; color:#0b132b;">
  <!-- Preheader -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    {{featured_ipo_name}} lists at {{listing_price}} representing {{listing_gain}} listing gain. Read details.
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb; padding:28px 0;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="width:680px; max-width:94%; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e5eaf2; box-shadow:0 18px 55px rgba(15,23,42,0.08);">
          <!-- Top Accent strip -->
          <tr>
            <td style="background:#071225; padding:11px 26px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px; color:#ffffff; font-weight:700; letter-spacing:0.2px;">
                    EXCHANGE LISTING DEBUT
                  </td>
                  <td align="right" style="font-size:12px; color:#9fb0c8;">
                    Listing Gain: {{listing_gain}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding:30px 34px 12px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <!-- Premium Logo -->
                          <img src="{{website_url}}/logo.png" alt="IPO Lens Logo" style="width:42px; height:42px; border-radius:12px; display:block; object-fit:cover;" />
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:24px; font-weight:900; color:#071225; letter-spacing:-0.5px;">
                            IPO Lens
                          </div>
                          <div style="font-size:13px; color:#64748b; margin-top:2px;">
                            Smarter IPO Research
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <a href="{{featured_ipo_url}}" style="background:#071225; color:#ffffff; padding:12px 18px; border-radius:12px; text-decoration:none; font-size:14px; font-weight:800; display:inline-block;">
                      Explore Performance →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Hero Section -->
          <tr>
            <td style="padding:18px 34px 28px 34px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%); border:1px solid #cbd5e1; border-radius:22px;">
                <tr>
                  <td style="padding:34px 30px;">
                    <div style="display:inline-block; background:#ffffff; border:1px solid #64748b; border-radius:999px; padding:6px 13px; color:#475569; font-size:11px; font-weight:800; margin-bottom:18px;">
                      LISTING DAY UPDATE
                    </div>
                    <h1 style="font-size:36px; line-height:1.1; margin:0; color:#071225; letter-spacing:-1px; font-weight:950;">
                      {{featured_ipo_name}} Lists on Exchanges
                    </h1>
                    <p style="font-size:15px; line-height:1.6; color:#475569; margin:16px 0 24px 0; max-width:560px;">
                      Shares of {{featured_ipo_name}} have officially commenced trading. Here is a summary of the listing day performance and final debut gains.
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <a href="{{featured_ipo_url}}" style="background:#071225; color:#ffffff; padding:14px 22px; border-radius:12px; text-decoration:none; font-size:15px; font-weight:900; display:inline-block;">
                            Analyze Post-Listing Metrics →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Performance Metrics -->
          <tr>
            <td style="padding:0 34px 28px 34px;">
              <div style="font-size:18px; font-weight:900; color:#071225; margin-bottom:16px;">
                Listing Day Statistics
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5eaf2; border-radius:20px; overflow:hidden; background:#ffffff;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding-bottom:16px; border-bottom:1px solid #f1f5f9; border-right:1px solid #f1f5f9; padding-right:12px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">OFFER/ISSUE PRICE</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{price_band}}</div>
                        </td>
                        <td width="50%" style="padding-bottom:16px; border-bottom:1px solid #f1f5f9; padding-left:20px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">DEBUT LISTING PRICE</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{listing_price}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-top:16px; border-right:1px solid #f1f5f9; padding-right:12px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">LISTING DEBUT GAINS</div>
                          <div style="font-size:18px; color:#059669; font-weight:900; margin-top:4px;">{{listing_gain}}</div>
                        </td>
                        <td width="50%" style="padding-top:16px; padding-left:20px;">
                          <div style="font-size:11px; color:#64748b; font-weight:700;">LISTING DATE</div>
                          <div style="font-size:18px; color:#071225; font-weight:900; margin-top:4px;">{{listing_date}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc; padding:22px 34px; border-top:1px solid #e5eaf2;">
              <p style="font-size:11px; line-height:1.65; color:#64748b; margin:0;">
                <strong>Disclaimer:</strong> IPO Lens is for educational and informational purposes only. We do not provide investment advice, IPO recommendations, buy/sell/hold calls, or guarantees of listing gains. IPO investments are subject to market risks. GMP is unofficial, unregulated and not guaranteed. Please read the DRHP/RHP and consult a qualified financial advisor before investing.
              </p>
              <p style="font-size:11px; line-height:1.6; color:#94a3b8; margin:16px 0 0 0;">
                You are receiving this email because you subscribed to IPO Lens updates.  
                <a href="{{unsubscribe_url}}" style="color:#64748b; text-decoration:underline;">Unsubscribe</a> •
                <a href="{{privacy_url}}" style="color:#64748b; text-decoration:underline;">Privacy Policy</a> •
                <a href="{{terms_url}}" style="color:#64748b; text-decoration:underline;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
