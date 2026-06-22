"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, Rocket, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function LearnCTA() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="learn-section learn-final-section">
      <div className="shell">
        <motion.div
          className="learn-final-cta"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <div>
            <span className="learn-final-kicker">
              <Rocket size={16} />
              Next step
            </span>
            <h2>Ready to research IPOs with confidence?</h2>
            <p>
              Use IPO Lens to check IPO score, GMP, subscription, financials, risks and plain-English summaries.
            </p>
            <div className="learn-final-actions">
              <Link href="/#ipos">
                Explore Live IPOs
                <ArrowRight size={17} />
              </Link>
              <Link href="/calendar">
                <CalendarDays size={17} />
                Open IPO Calendar
              </Link>
            </div>
          </div>

          <div className="learn-rocket-visual" aria-hidden="true">
            <div className="learn-rocket-card">
              <Rocket size={42} />
              <span />
            </div>
            <div className="learn-up-graph">
              <TrendingUp size={72} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
