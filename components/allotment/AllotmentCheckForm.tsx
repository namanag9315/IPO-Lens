"use client";

import { useState, useEffect } from "react";
import { AllotmentResult, CheckType, Registrar } from "@/lib/allotment/types";
import { AllotmentEligibleIPO } from "@/lib/allotment/data";
import { getFallbackLinks, RegistrarLink } from "@/lib/allotment/registrarLinks";
import AllotmentResultCard from "./AllotmentResultCard";

export default function AllotmentCheckForm({ 
  ipos, 
  initialIpoSlug 
}: { 
  ipos: AllotmentEligibleIPO[]; 
  initialIpoSlug?: string | null;
}) {
  const defaultIpo = ipos.find(i => i.slug === initialIpoSlug) || ipos[0];
  
  const [ipoId, setIpoId] = useState(defaultIpo?.ipoId || "Mock IPO");
  const [registrar, setRegistrar] = useState<Registrar>(defaultIpo?.registrar || "MOCK");
  const [checkType, setCheckType] = useState<CheckType>("PAN");
  const [value, setValue] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AllotmentResult | null>(null);

  const selectedIpo = ipos.find(i => i.ipoId === ipoId);
  const fallbackLinks = selectedIpo ? getFallbackLinks(registrar, selectedIpo.exchange) : [];

  useEffect(() => {
    if (selectedIpo && selectedIpo.registrar) {
      setRegistrar(selectedIpo.registrar);
    } else {
      setRegistrar("MOCK");
    }
  }, [ipoId, selectedIpo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/allotment/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipoId, registrar, checkType, value }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({
        status: "ERROR",
        message: "Failed to connect to the allotment service.",
        ipoName: selectedIpo?.name || ipoId,
        investorName: null,
        allottedShares: null,
        applicationNumberMasked: null,
        panMasked: null,
        source: "Client",
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>Select IPO</label>
          <select 
            value={ipoId} 
            onChange={(e) => setIpoId(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 14 }}
          >
            {ipos.length === 0 && <option value="Mock IPO">Mock IPO (For Testing)</option>}
            {ipos.map(ipo => (
              <option key={ipo.ipoId} value={ipo.ipoId}>{ipo.name} {ipo.registrar ? "" : "(Registrar not available)"}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>Registrar</label>
            <select 
              value={registrar} 
              onChange={(e) => setRegistrar(e.target.value as Registrar)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 14 }}
            >
              <option value="MOCK">Mock Provider</option>
              <option value="KFINTECH">KFin Technologies</option>
              <option value="MUFG_INTIME">Link Intime</option>
              <option value="BIGSHARE">Bigshare Services</option>
              <option value="BSE">BSE India</option>
              <option value="NSE">NSE India</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>Search By</label>
            <select 
              value={checkType} 
              onChange={(e) => setCheckType(e.target.value as CheckType)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 14 }}
            >
              <option value="PAN">PAN Number</option>
              <option value="APPLICATION_NO">Application Number</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>
            {checkType === "PAN" ? "Enter PAN" : "Enter Application Number"}
          </label>
          <input 
            type="text" 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            placeholder={checkType === "PAN" ? "ABCDE1234F" : "App Number"}
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 14, textTransform: "uppercase" }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading || !value}
          style={{
            background: "var(--primary-navy)", color: "#fff", padding: "12px", borderRadius: 8,
            fontWeight: 800, fontSize: 15, marginTop: 8, cursor: isLoading || !value ? "not-allowed" : "pointer",
            opacity: isLoading || !value ? 0.7 : 1, border: "none"
          }}
        >
          {isLoading ? "Checking..." : "Check Allotment"}
        </button>
      </form>

      <AllotmentResultCard result={result} fallbackLinks={fallbackLinks} />
    </div>
  );
}
