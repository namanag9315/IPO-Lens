"use client";

import { useEffect, useMemo, useState } from "react";
import SavedProfileCheckTable from "@/components/allotment/SavedProfileCheckTable";
import type { AllotmentIPOOption, SavedPANProfile, SavedProfileCheckResult } from "@/lib/allotment/types";

interface SavedPANProfilesProps {
  selectedIPO: AllotmentIPOOption | null;
}

export default function SavedPANProfiles({ selectedIPO }: SavedPANProfilesProps) {
  const [profiles, setProfiles] = useState<SavedPANProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [nickname, setNickname] = useState("");
  const [pan, setPan] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "signed-out" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<SavedProfileCheckResult[]>([]);

  const selectedCount = useMemo(() => selected.length, [selected]);

  async function loadProfiles() {
    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/pan-profiles");
      const payload = (await response.json()) as { error?: string; profiles?: SavedPANProfile[] };

      if (response.status === 401) {
        setStatus("signed-out");
        setProfiles([]);
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load profiles.");
      }

      setProfiles(payload.profiles ?? []);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Unable to load saved PAN profiles.");
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function saveProfile() {
    setMessage(null);

    try {
      const response = await fetch("/api/pan-profiles", {
        body: JSON.stringify({ consent, nickname, pan }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; profile?: SavedPANProfile };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save PAN profile.");
      }

      setNickname("");
      setPan("");
      setConsent(false);
      await loadProfiles();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save PAN profile.");
    }
  }

  async function deleteProfile(id: string) {
    setMessage(null);

    try {
      const response = await fetch(`/api/pan-profiles/${id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Unable to delete PAN profile.");
      }

      setSelected((items) => items.filter((item) => item !== id));
      await loadProfiles();
    } catch {
      setMessage("Unable to delete PAN profile.");
    }
  }

  async function checkSelectedProfiles() {
    if (!selectedIPO || selected.length === 0) {
      setMessage("Select an IPO and at least one saved PAN profile.");
      return;
    }

    setChecking(true);
    setMessage(null);

    try {
      const response = await fetch("/api/allotment/check-saved", {
        body: JSON.stringify({ ipoId: selectedIPO.id, panProfileIds: selected }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; results?: SavedProfileCheckResult[] };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to check selected profiles.");
      }

      setResults(payload.results ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to check selected profiles.");
    } finally {
      setChecking(false);
    }
  }

  if (status === "signed-out") {
    return (
      <div className="premium-card saved-pan-card">
        <span className="allotment-card-label">Saved PAN Profiles</span>
        <h3>Family checks in one click</h3>
        <p>Sign in to save PAN profiles and check allotment for family members in one click.</p>
      </div>
    );
  }

  return (
    <div className="premium-card saved-pan-card">
      <div className="allotment-card-head">
        <div>
          <span className="allotment-card-label">Saved PAN Profiles</span>
          <h3>Optional secure profile checks</h3>
        </div>
      </div>
      <p>Saved profiles require sign-in and explicit consent. Full PAN is never returned to the browser after saving.</p>

      <div className="saved-pan-form">
        <input onChange={(event) => setNickname(event.target.value)} placeholder="Nickname" value={nickname} />
        <input onChange={(event) => setPan(event.target.value.toUpperCase())} placeholder="PAN" value={pan} />
        <label>
          <input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" /> I agree to save this PAN securely
          for future IPO allotment checks.
        </label>
        <button disabled={!consent || !nickname || !pan || status === "loading"} onClick={saveProfile} type="button">
          Save PAN profile
        </button>
      </div>

      <div className="saved-pan-list">
        {profiles.map((profile) => (
          <div className="saved-pan-row" key={profile.id}>
            <label>
              <input
                checked={selected.includes(profile.id)}
                onChange={(event) => {
                  setSelected((items) =>
                    event.target.checked ? [...items, profile.id] : items.filter((item) => item !== profile.id),
                  );
                }}
                type="checkbox"
              />
              <span>
                <strong>{profile.nickname}</strong>
                <small className="mono">{profile.panMasked}</small>
              </span>
            </label>
            <button onClick={() => void deleteProfile(profile.id)} type="button">
              Delete
            </button>
          </div>
        ))}
      </div>

      {profiles.length > 0 ? (
        <button className="saved-pan-check" disabled={!selectedIPO || selectedCount === 0 || checking} onClick={() => void checkSelectedProfiles()} type="button">
          {checking ? "Checking..." : `Check selected profiles${selectedCount ? ` (${selectedCount})` : ""}`}
        </button>
      ) : null}

      {message ? <p className="form-error">{message}</p> : null}
      <SavedProfileCheckTable results={results} />
    </div>
  );
}
