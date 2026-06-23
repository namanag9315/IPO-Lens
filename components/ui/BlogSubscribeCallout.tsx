"use client";

import React from "react";

interface BlogSubscribeCalloutProps {
  title?: string;
  description?: string;
  buttonText?: string;
}

export default function BlogSubscribeCallout({
  title = "🔥 Want Live GMP Alerts & Analysis?",
  description = "Get real-time subscription trackers, allotment status indicators, and grey market analysis direct.",
  buttonText = "Subscribe to Live Alerts"
}: BlogSubscribeCalloutProps) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-subscription-banner"));
  };

  return (
    <div style={{
      background: "var(--blue-soft)",
      border: "1px solid rgba(37,99,255,0.15)",
      borderRadius: "16px",
      padding: "24px",
      marginTop: "40px",
      textAlign: "center"
    }}>
      <h4 style={{ margin: "0 0 8px 0", color: "var(--ink)", fontSize: "16px", fontWeight: "800" }}>{title}</h4>
      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--muted)" }}>{description}</p>
      <button 
        onClick={handleClick}
        className="premium-navbar-subscribe-btn"
        style={{ margin: "0 auto", display: "inline-flex" }}
        type="button"
      >
        {buttonText}
      </button>
    </div>
  );
}
