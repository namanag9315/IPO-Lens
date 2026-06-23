"use client";

import React, { useState } from "react";
import { Mail, Sparkles, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setMessage(data.message || "Thank you for subscribing!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to connect to the subscription service.");
    }
  };

  return (
    <div 
      style={{
        background: "linear-gradient(135deg, #0B132B 0%, #16223F 100%)",
        color: "#ffffff",
        borderRadius: "24px",
        padding: "48px 40px",
        boxShadow: "0 20px 40px rgba(11, 19, 43, 0.15)",
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif"
      }}
    >
      {/* Decorative radial gradients for glowing aesthetics */}
      <div 
        style={{
          position: "absolute",
          top: "-50%",
          right: "-30%",
          width: "350px",
          height: "350px",
          background: "radial-gradient(circle, rgba(37, 99, 255, 0.2) 0%, rgba(37, 99, 255, 0) 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div 
        style={{
          position: "absolute",
          bottom: "-50%",
          left: "-20%",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(0, 196, 140, 0.1) 0%, rgba(0, 196, 140, 0) 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "24px", position: "relative", zIndex: 1 }}>
        <div style={{ flex: "1 1 400px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ display: "inline-flex", background: "rgba(37, 99, 255, 0.15)", color: "#93c5fd", border: "1px solid rgba(37, 99, 255, 0.3)", borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: "700" }}>
              <Sparkles size={12} style={{ marginRight: "4px", display: "inline" }} />
              IPO Updates
            </span>
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "900", letterSpacing: "-0.03em", color: "#ffffff", margin: "0 0 10px 0", lineHeight: "1.2" }}>
            Get GMP Alerts & Smart IPO Research Direct to Your Inbox
          </h2>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0, lineHeight: "1.6", fontWeight: "500", maxWidth: "480px" }}>
            Join our newsletter to receive real-time Grey Market Premium (GMP) alerts, plain-English analysis summaries, and objects-of-issue risk checks.
          </p>
        </div>

        <div style={{ flex: "1 1 320px", maxWidth: "480px", width: "100%" }}>
          {status === "success" ? (
            <div 
              style={{
                background: "rgba(0, 196, 140, 0.1)",
                border: "1px solid rgba(0, 196, 140, 0.3)",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <CheckCircle2 size={36} style={{ color: "#00C48C", margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "16px", fontWeight: "750", color: "#ffffff", margin: "0 0 6px 0" }}>Subscription Confirmed!</h3>
              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: 0 }}>
                {message}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              <div 
                style={{ 
                  display: "flex", 
                  background: "rgba(255, 255, 255, 0.05)", 
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "14px",
                  padding: "6px",
                  position: "relative",
                  alignItems: "center"
                }}
                className="input-container-newsletter"
              >
                <Mail size={18} style={{ color: "#94a3b8", marginLeft: "12px", marginRight: "8px", flexShrink: 0 }} />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  required
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    width: "100%",
                    padding: "8px 4px",
                    fontWeight: "500"
                  }}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  style={{
                    background: "#2563FF",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0 18px",
                    height: "38px",
                    fontSize: "13px",
                    fontWeight: "750",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 150ms ease",
                    flexShrink: 0,
                    opacity: status === "loading" ? 0.7 : 1
                  }}
                  className="subscribe-btn"
                >
                  {status === "loading" ? "Subscribing..." : <>Subscribe <ArrowRight size={14} /></>}
                </button>
              </div>

              {status === "error" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f87171", fontSize: "12px", fontWeight: "600", marginTop: "4px", padding: "0 8px" }}>
                  <AlertCircle size={14} style={{ display: "inline" }} />
                  <span>{message}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .input-container-newsletter:focus-within {
          border-color: #2563FF !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 255, 0.15) !important;
        }
        .subscribe-btn:hover {
          background: #1d4ed8 !important;
          transform: translateX(1px);
        }
      `}} />
    </div>
  );
}
