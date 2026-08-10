"use client";

import { useMemo, useState } from "react";
import AllotmentFallbackLinks from "@/components/allotment/AllotmentFallbackLinks";
import AllotmentProbabilityCard from "@/components/allotment/AllotmentProbabilityCard";
import AllotmentResultCard from "@/components/allotment/AllotmentResultCard";
import RegistrarBadge from "@/components/allotment/RegistrarBadge";
import SavedPANProfiles from "@/components/allotment/SavedPANProfiles";
import { registrarLabel } from "@/lib/allotment/registrarLinks";
import type { AllotmentCheckResponse, AllotmentCheckType, AllotmentIPOOption, AllotmentRegistrar } from "@/lib/allotment/types";

interface AllotmentCheckFormProps {
  initialSlug?: string;
  ipos: AllotmentIPOOption[];
}

const DEFAULT_REGISTRAR: AllotmentRegistrar = "BSE";
const registrars: AllotmentRegistrar[] = ["KFINTECH", "MUFG_INTIME", "BIGSHARE", "BSE", "NSE"];

function productionRegistrar(registrar: AllotmentRegistrar | null | undefined) {
  return registrar === "MOCK" ? DEFAULT_REGISTRAR : registrar ?? DEFAULT_REGISTRAR;
}

function dateLabel(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "TBA";
}

export default function AllotmentCheckForm({ initialSlug, ipos }: AllotmentCheckFormProps) {
  const initialIPO = ipos.find((ipo) => ipo.slug === initialSlug) ?? ipos[0] ?? null;
  const [ipoId, setIpoId] = useState(initialIPO?.id ?? "");
  const selectedIPO = useMemo(() => ipos.find((ipo) => ipo.id === ipoId) ?? null, [ipoId, ipos]);
  const [registrar, setRegistrar] = useState<AllotmentRegistrar>(productionRegistrar(initialIPO?.registrar));
  const [checkType, setCheckType] = useState<AllotmentCheckType>("PAN");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AllotmentCheckResponse | null>(null);

  function onIPOChange(nextId: string) {
    const nextIPO = ipos.find((ipo) => ipo.id === nextId) ?? null;
    setIpoId(nextId);
    setRegistrar(productionRegistrar(nextIPO?.registrar));
    setResult(null);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/allotment/check", {
        body: JSON.stringify({ checkType, ipoId, registrar, value }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as AllotmentCheckResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to check allotment status.");
      }

      setResult(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to check allotment status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="allotment-layout">
      <div className="allotment-main-stack">
        <div className="premium-card allotment-form-card">
          <div className="allotment-card-head">
            <div>
              <span className="allotment-card-label">Manual checker</span>
              <h3>Check allotment status</h3>
            </div>
            <RegistrarBadge registrar={registrar} />
          </div>

          <div className="allotment-selected-ipo">
            <label>
              IPO
              <select onChange={(event) => onIPOChange(event.target.value)} value={ipoId}>
                {ipos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id}>
                    {ipo.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span>Allotment date</span>
              <strong className="mono">{dateLabel(selectedIPO?.allotmentDate ?? null)}</strong>
            </div>
            <div>
              <span>Listing date</span>
              <strong className="mono">{dateLabel(selectedIPO?.listingDate ?? null)}</strong>
            </div>
          </div>

          <div className="allotment-form-grid">
            <label>
              Registrar
              <select onChange={(event) => setRegistrar(event.target.value as AllotmentRegistrar)} value={registrar}>
                {registrars.map((item) => (
                  <option key={item} value={item}>
                    {registrarLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Check method
              <select onChange={(event) => setCheckType(event.target.value as AllotmentCheckType)} value={checkType}>
                <option value="PAN">PAN</option>
                <option value="APPLICATION_NO">Application Number</option>
                <option value="DEMAT">Demat ID / Client ID</option>
              </select>
            </label>
            <label className="allotment-input-wide">
              {checkType === "PAN" ? "PAN" : checkType === "APPLICATION_NO" ? "Application number" : "Demat ID / Client ID"}
              <input
                autoComplete="off"
                onChange={(event) => setValue(checkType === "PAN" ? event.target.value.toUpperCase() : event.target.value)}
                placeholder={checkType === "PAN" ? "ABCDE1234F" : "Enter identifier"}
                value={value}
              />
            </label>
          </div>

          <button className="allotment-submit" disabled={!ipoId || !value || loading} onClick={() => void submit()} type="button">
            {loading ? "Checking..." : "Check allotment"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <AllotmentResultCard result={result} />
        <SavedPANProfiles selectedIPO={selectedIPO} />
      </div>

      <aside className="allotment-side-stack">
        <AllotmentProbabilityCard retailSubscription={selectedIPO?.retailSubscription ?? null} />
        <AllotmentFallbackLinks registrar={registrar} />
      </aside>
    </div>
  );
}
