"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Building2, ShieldCheck, Store } from "lucide-react";
import LearnButton from "@/components/learn/LearnButton";

export default function MainboardVsSME() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="learn-section learn-sme-section" id="sme-ipo">
      <div className="shell">
        <div className="learn-section-head centered">
          <span className="learn-section-kicker">06 · Mainboard vs SME IPOs</span>
          <h2>Same IPO idea, very different risk profile</h2>
          <p>Both routes bring companies to public markets, but beginners should treat SME IPOs with extra care.</p>
        </div>

        <div className="learn-compare-grid">
          <motion.article
            className="learn-compare-card mainboard"
            initial={shouldReduceMotion ? false : { opacity: 0, x: -34 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.45 }}
          >
            <div className="learn-compare-icon">
              <Building2 size={26} />
            </div>
            <h3>Mainboard IPO</h3>
            <ul>
              <li>Usually larger companies</li>
              <li>More liquidity</li>
              <li>Better disclosures</li>
              <li>Lower relative risk compared to SME</li>
            </ul>
          </motion.article>

          <motion.article
            className="learn-compare-card sme"
            initial={shouldReduceMotion ? false : { opacity: 0, x: 34 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.45 }}
          >
            <div className="learn-compare-icon amber">
              <Store size={26} />
            </div>
            <h3>SME IPO</h3>
            <ul>
              <li>Smaller companies</li>
              <li>Higher risk</li>
              <li>Lower liquidity</li>
              <li>Wider price swings</li>
              <li>More careful research needed</li>
            </ul>
            <LearnButton topic="smeIpo" variant="link" />
          </motion.article>
        </div>

        <motion.div
          className="learn-sme-warning"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <AlertTriangle size={20} />
          <div>
            <strong>SME IPOs can be risky, less liquid and more volatile.</strong>
            <p>Beginners should be extra careful and should understand lot size, liquidity and listing risk before applying.</p>
          </div>
          <ShieldCheck size={22} />
        </motion.div>
      </div>
    </section>
  );
}
