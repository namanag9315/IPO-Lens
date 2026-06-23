"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  Dice5,
  Droplets,
  Percent,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { riskCards } from "@/lib/learn-content";

const riskIconMap = {
  line: TrendingUp,
  building: Building2,
  percent: Percent,
  droplets: Droplets,
  alert: AlertTriangle,
  dice: Dice5,
  down: TrendingDown,
  shield: ShieldAlert,
};

export default function RiskCards() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="learn-section" id="risks">
      <div className="shell">
        <div className="learn-section-head">
          <span className="learn-section-kicker">07 · Risks to Consider</span>
          <h2>Every IPO has risk, even popular ones</h2>
          <p>Risk is not a reason to panic. It is a reason to research slowly and avoid blind applications.</p>
        </div>

        <motion.div
          className="learn-risk-grid"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.16 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.055 } },
          }}
        >
          {riskCards.map((risk) => {
            const Icon = riskIconMap[risk.icon as keyof typeof riskIconMap];

            return (
              <div className="learn-risk-card-container" key={risk.title}>
                <motion.article
                  className={`learn-risk-card learn-risk-card-tilt ${risk.tone}`}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0 },
                  }}
                  onMouseMove={(e) => {
                    const card = e.currentTarget;
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    card.style.setProperty("--mouse-x", `${x}px`);
                    card.style.setProperty("--mouse-y", `${y}px`);
                  }}
                  whileHover={
                    shouldReduceMotion
                      ? {}
                      : {
                          y: -6,
                          rotateX: 4,
                          rotateY: -4,
                          scale: 1.015,
                        }
                  }
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="learn-risk-card-glow" />
                  <span style={{ position: "relative", zIndex: 3 }}>
                    <Icon size={20} />
                  </span>
                  <h3 style={{ position: "relative", zIndex: 3, marginTop: 0 }}>{risk.title}</h3>
                  <p style={{ position: "relative", zIndex: 3, flex: 1, marginTop: 12 }}>{risk.body}</p>
                </motion.article>
              </div>
            );
          })}
        </motion.div>

        <div className="learn-large-warning">
          <AlertTriangle size={22} />
          <strong>No IPO gives guaranteed listing gains.</strong>
          <p>Good research improves your understanding, but market outcomes can still be different from expectations.</p>
        </div>
      </div>
    </section>
  );
}
