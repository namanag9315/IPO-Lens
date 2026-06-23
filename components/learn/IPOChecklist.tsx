"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CircleDotDashed, ShieldCheck } from "lucide-react";
import { useState } from "react";
import LearnButton from "@/components/learn/LearnButton";
import { analysisChecklist } from "@/lib/learn-content";

export default function IPOChecklist() {
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const [checkedStates, setCheckedStates] = useState<boolean[]>(
    Array(analysisChecklist.length).fill(false)
  );

  const toggleCheck = (index: number) => {
    setCheckedStates((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const checkedCount = checkedStates.filter(Boolean).length;
  const totalScore = analysisChecklist.reduce(
    (sum, item, index) => sum + (checkedStates[index] ? item.score : 0),
    0
  );

  return (
    <section className="learn-section learn-checklist-section" id="analyze-ipo">
      <div className="shell learn-checklist-layout">
        <aside className="learn-checklist-sticky">
          <span className="learn-section-kicker">05 · How to Analyze</span>
          <h2>The IPO Lens Checklist</h2>
          <p>
            Do not apply only because GMP is high. First understand whether the company is financially strong and fairly
            valued.
          </p>

          <div className="learn-checklist-header-wrap" style={{ marginTop: "22px" }}>
            <div className="learn-checklist-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
                {/* Background track circle */}
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="4"
                />
                {/* Active progress circle */}
                <motion.circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "163.36", strokeDashoffset: "163.36" }}
                  animate={{
                    strokeDashoffset: 163.36 - (totalScore / 100) * 163.36
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </svg>
              <div className="learn-checklist-ring-text">
                <strong>{totalScore}%</strong>
              </div>
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>Readiness</h4>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: 1.3 }}>
                {checkedCount} of {analysisChecklist.length} checks
              </p>
            </div>
          </div>

          <div className="learn-checklist-nav">
            {analysisChecklist.map((item, index) => (
              <a
                className={activeIndex === index ? "active" : ""}
                href={`#check-${index + 1}`}
                key={item.title}
                onClick={() => setActiveIndex(index)}
              >
                {checkedStates[index] ? (
                  <CheckCircle2 size={16} style={{ color: "var(--green)" }} />
                ) : (
                  <CircleDotDashed size={16} />
                )}
                {item.title}
              </a>
            ))}
          </div>

          <LearnButton topic="ipoScore" variant="pill" size="md" />
        </aside>

        <div className="learn-checklist-cards">
          {analysisChecklist.map((item, index) => (
            <motion.article
              className={`learn-check-card ${checkedStates[index] ? "checked" : ""}`}
              id={`check-${index + 1}`}
              key={item.title}
              onViewportEnter={() => setActiveIndex(index)}
              onClick={() => toggleCheck(index)}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ amount: 0.55 }}
              transition={{ duration: 0.38 }}
              role="checkbox"
              aria-checked={checkedStates[index]}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggleCheck(index);
                }
              }}
            >
              <div className="learn-check-card-index" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" style={{ pointerEvents: "none" }}>
                    <circle
                      cx="11"
                      cy="11"
                      r="9"
                      fill="none"
                      stroke={checkedStates[index] ? "var(--green)" : "var(--line)"}
                      strokeWidth="2"
                      style={{ transition: "stroke 0.2s ease" }}
                    />
                    <path
                      d="M 7 11 L 10 14 L 15 8"
                      fill="none"
                      stroke="var(--green)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="learn-checkbox-tick-path"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
              <div className="learn-check-card-score">
                <ShieldCheck size={17} />
                <span>+{item.score}</span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
