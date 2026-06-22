"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { ipoBasicsCards, journeyStages } from "@/lib/learn-content";

const stageIcons = {
  building: Building2,
  file: FileText,
  badge: BadgeIndianRupee,
  cursor: MousePointerClick,
  check: CheckCircle2,
  chart: TrendingUp,
};

const flowIcons = [Building2, FileText, Landmark, CheckCircle2];

export function WhatIsIPOSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="learn-section" id="what-is-ipo">
      <div className="shell learn-two-col">
        <motion.div
          className="learn-section-copy"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.45 }}
        >
          <span className="learn-section-kicker">01 · What is an IPO?</span>
          <h2>An IPO is the first public share sale of a private company.</h2>
          <p>
            An IPO, or Initial Public Offering, is when a private company offers its shares to the public for the first
            time. After listing, investors can buy and sell those shares on the stock exchange.
          </p>
          <p className="learn-soft-note">
            Think of it as a company opening its ownership door to public investors, while asking the market to decide
            what the business is worth.
          </p>
        </motion.div>

        <motion.div
          className="learn-flow-card"
          initial={shouldReduceMotion ? false : { opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.5 }}
        >
          <div className="learn-flow">
            {["Private Company", "IPO", "Stock Exchange", "Public Investors"].map((label, index) => {
              const Icon = flowIcons[index];

              return (
                <div className="learn-flow-step" key={label}>
                  <motion.div
                    className="learn-flow-icon"
                    initial={shouldReduceMotion ? false : { scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.12, duration: 0.32 }}
                  >
                    <Icon size={22} />
                  </motion.div>
                  <span>{label}</span>
                  {index < 3 ? (
                    <motion.i
                      className="learn-flow-arrow"
                      initial={shouldReduceMotion ? false : { scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.16 + index * 0.12, duration: 0.35 }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="learn-mini-card-grid">
            {ipoBasicsCards.map((card) => (
              <div className="learn-mini-card" key={card.title}>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function IPOJourneyMap() {
  const [activeStage, setActiveStage] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="learn-section learn-journey-section" id="ipo-journey">
      <div className="shell">
        <div className="learn-section-head centered">
          <span className="learn-section-kicker">02 · IPO Journey Map</span>
          <h2>From private company to listing day</h2>
          <p>Follow the journey step by step and notice what a retail investor should check at each stage.</p>
        </div>

        <div className="learn-journey-layout">
          <div className="learn-journey-sticky" aria-hidden="true">
            <div className="learn-orbital-map">
              <div className="learn-orbital-core">
                <span>{String(activeStage + 1).padStart(2, "0")}</span>
                <strong>{journeyStages[activeStage].title}</strong>
              </div>
              {journeyStages.map((stage, index) => {
                const Icon = stageIcons[stage.icon as keyof typeof stageIcons];
                const isActive = activeStage === index;

                return (
                  <div className={`learn-orbit-node node-${index + 1} ${isActive ? "active" : ""}`} key={stage.title}>
                    <Icon size={18} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="learn-journey-cards">
            {journeyStages.map((stage, index) => {
              const Icon = stageIcons[stage.icon as keyof typeof stageIcons];

              return (
                <motion.article
                  className={`learn-journey-card ${activeStage === index ? "active" : ""}`}
                  key={stage.title}
                  onViewportEnter={() => setActiveStage(index)}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 34 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ amount: 0.55 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="learn-journey-number">{String(index + 1).padStart(2, "0")}</div>
                  <div className="learn-journey-icon">
                    <Icon size={21} />
                  </div>
                  <div>
                    <h3>{stage.title}</h3>
                    <p>{stage.explanation}</p>
                    <span>Investor should know: {stage.investorNote}</span>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
