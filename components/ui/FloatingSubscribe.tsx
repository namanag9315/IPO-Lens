"use client";

import React, { useState, useEffect } from "react";
import { Mail, Sparkles, CheckCircle2, AlertCircle, ArrowRight, X, MessageSquare } from "lucide-react";
import { getWhatsAppTrialHref } from "@/lib/updateLinks";

export default function FloatingSubscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [whatsappHref, setWhatsappHref] = useState("");

  useEffect(() => {
    // Set WhatsApp link on client side
    setWhatsappHref(getWhatsAppTrialHref());

    // Check localStorage for subscription
    const isSubscribed = localStorage.getItem("ipo_lens_subscribed") === "true";

    if (!isSubscribed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Listen for custom window event to force-open
    const handleForceOpen = () => {
      setIsVisible(true);
      setIsExpanded(true);
    };

    window.addEventListener("open-subscription-banner", handleForceOpen);
    return () => {
      window.removeEventListener("open-subscription-banner", handleForceOpen);
    };
  }, []);

  const handleDismiss = () => {
    setIsExpanded(false);
    localStorage.setItem("ipo_lens_dismissed", Date.now().toString());
  };

  const handleOpen = () => {
    setIsVisible(true);
    setIsExpanded(true);
  };

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
        localStorage.setItem("ipo_lens_subscribed", "true");
        setEmail("");
        // Hide after 3 seconds on success
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to connect to the subscription service.");
    }
  };

  if (!isVisible) return null;

  if (!isExpanded) {
    return (
      <>
        <button
          aria-label="Open IPO Lens email and WhatsApp alerts"
          className="floating-subscribe-pill"
          onClick={handleOpen}
          type="button"
        >
          <Sparkles size={17} />
          <span>Get Alerts</span>
        </button>

        <style dangerouslySetInnerHTML={{ __html: `
          .floating-subscribe-pill {
            align-items: center;
            background: linear-gradient(180deg, #2563ff, #0b4fd8);
            border: 1px solid rgba(37, 99, 255, 0.8);
            border-radius: 999px;
            bottom: 22px;
            box-shadow: 0 18px 34px rgba(37, 99, 255, 0.26);
            color: #ffffff;
            cursor: pointer;
            display: inline-flex;
            font-family: Inter, sans-serif;
            font-size: 14px;
            font-weight: 900;
            gap: 8px;
            min-height: 48px;
            padding: 0 18px;
            position: fixed;
            right: 22px;
            z-index: 9999;
          }
          .floating-subscribe-pill:hover {
            transform: translateY(-1px);
          }
          @media (max-width: 760px) {
            .floating-subscribe-pill {
              bottom: 16px;
              right: 16px;
            }
          }
        `}} />
      </>
    );
  }

  return (
    <div 
      style={{
        position: "fixed",
        bottom: "22px",
        left: "22px",
        width: "340px",
        maxWidth: "calc(100vw - 48px)",
        background: "linear-gradient(135deg, #0B132B 0%, #1c2a4f 100%)",
        color: "#ffffff",
        borderRadius: "18px",
        padding: "18px",
        boxShadow: "0 20px 40px rgba(11, 19, 43, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        zIndex: 9999,
        fontFamily: "Inter, sans-serif",
        animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        boxSizing: "border-box",
        maxHeight: "calc(100vh - 112px)",
        overflowY: "auto"
      }}
      className="floating-subscribe-widget"
    >
      <button 
        onClick={handleDismiss}
        aria-label="Dismiss subscription promo"
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          background: "rgba(255, 255, 255, 0.1)",
          border: "none",
          color: "#94a3b8",
          borderRadius: "50%",
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
        className="close-btn"
      >
        <X size={15} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ display: "inline-flex", background: "rgba(37, 99, 255, 0.25)", color: "#93c5fd", border: "1px solid rgba(37, 99, 255, 0.4)", borderRadius: "999px", padding: "4px 10px", fontSize: "11px", fontWeight: "700" }}>
          <Sparkles size={11} style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }} />
          Stay Ahead
        </span>
      </div>

      <h4 style={{ fontSize: "17px", fontWeight: "800", letterSpacing: "-0.02em", color: "#ffffff", margin: "0 0 7px 0", lineHeight: "1.25", paddingRight: "24px" }}>
        Get IPO alerts in your inbox
      </h4>
      
      <p style={{ fontSize: "12px", color: "#cbd5e1", margin: "0 0 14px 0", lineHeight: "1.45" }}>
        GMP updates, plain-English research summaries and risk signals sent direct.
      </p>

      {status === "success" ? (
        <div 
          style={{
            background: "rgba(0, 196, 140, 0.15)",
            border: "1px solid rgba(0, 196, 140, 0.3)",
            borderRadius: "12px",
            padding: "16px",
            textAlign: "center",
            marginTop: "8px"
          }}
        >
          <CheckCircle2 size={28} style={{ color: "#00C48C", margin: "0 auto 8px" }} />
          <h5 style={{ fontSize: "14px", fontWeight: "750", color: "#ffffff", margin: "0 0 4px 0" }}>Subscription Confirmed!</h5>
          <p style={{ fontSize: "12px", color: "#a7f3d0", margin: 0 }}>
            {message}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          <div 
            style={{ 
              display: "flex", 
              background: "rgba(255, 255, 255, 0.07)", 
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              padding: "4px",
              position: "relative",
              alignItems: "center"
            }}
            className="input-container-float"
          >
            <Mail size={16} style={{ color: "#94a3b8", marginLeft: "10px", marginRight: "6px", flexShrink: 0 }} />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              required
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontSize: "13px",
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
                borderRadius: "8px",
                padding: "0 14px",
                height: "32px",
                fontSize: "12px",
                fontWeight: "750",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 150ms ease",
                flexShrink: 0,
                opacity: status === "loading" ? 0.7 : 1
              }}
              className="subscribe-float-btn"
            >
              {status === "loading" ? "..." : <>Join <ArrowRight size={12} /></>}
            </button>
          </div>

          {status === "error" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f87171", fontSize: "11px", fontWeight: "600", padding: "0 4px" }}>
              <AlertCircle size={12} style={{ display: "inline" }} />
              <span>{message}</span>
            </div>
          )}
        </form>
      )}

      {/* WhatsApp channel alternative */}
      {whatsappHref && (
        <div style={{ marginTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Prefer WhatsApp alerts?</span>
          <a 
            href={whatsappHref} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "4px", 
              fontSize: "11px", 
              color: "#00C48C", 
              fontWeight: "700",
              textDecoration: "none"
            }}
            className="whatsapp-float-link"
          >
            <MessageSquare size={12} />
            Try 15 Days Free
          </a>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from {
            transform: translateY(40px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
        }
        .input-container-float:focus-within {
          border-color: #2563FF !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 255, 0.15) !important;
        }
        .subscribe-float-btn:hover {
          background: #1d4ed8 !important;
        }
        .whatsapp-float-link:hover {
          color: #00e0a1 !important;
          text-decoration: underline !important;
        }
        @media (max-width: 760px) {
          .floating-subscribe-widget {
            bottom: 16px !important;
            left: 16px !important;
            max-width: calc(100vw - 32px) !important;
            padding: 16px !important;
            width: calc(100vw - 32px) !important;
          }
        }
      `}} />
    </div>
  );
}
