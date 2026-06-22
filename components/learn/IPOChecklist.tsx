"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CircleDotDashed, Gauge, ShieldCheck } from "lucide-react";
import { useState } from "react";
import LearnButton from "@/components/learn/LearnButton";
import { analysisChecklist } from "@/lib/learn-content";

export default function IPOChecklist() {
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const totalScore = analysisChecklist.slice(0, activeIndex + 1).reduce((sum, item) => sum + item.score, 0);

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

          <div className="learn-score-shell">
            <div className="learn-score-ring">
              <Gauge size={24} />
              <strong>{Math.min(totalScore, 100)}</strong>
              <span>/100</span>
            </div>
            <small>Educational research readiness</small>
          </div>

          <div className="learn-checklist-nav">
            {analysisChecklist.map((item, index) => (
              <a className={activeIndex === index ? "active" : ""} href={`#check-${index + 1}`} key={item.title}>
                {activeIndex >= index ? <CheckCircle2 size={16} /> : <CircleDotDashed size={16} />}
                {item.title}
              </a>
            ))}
          </div>

          <LearnButton topic="ipoScore" variant="pill" size="md" />
        </aside>

        <div className="learn-checklist-cards">
          {analysisChecklist.map((item, index) => (
            <motion.article
              className="learn-check-card"
              id={`check-${index + 1}`}
              key={item.title}
              onViewportEnter={() => setActiveIndex(index)}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ amount: 0.55 }}
              transition={{ duration: 0.38 }}
            >
              <div className="learn-check-card-index">{String(index + 1).padStart(2, "0")}</div>
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
