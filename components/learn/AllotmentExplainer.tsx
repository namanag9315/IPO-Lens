"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BadgeIndianRupee, CheckCircle2, FileCheck2, RotateCcw, Ticket, UsersRound, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

const scenarios = [
  {
    label: "Low demand",
    multiple: "1.0x",
    allotted: 18,
    tone: "green",
    message: "When demand is close to shares available, allotment is easier to understand.",
  },
  {
    label: "High demand",
    multiple: "7.0x",
    allotted: 8,
    tone: "amber",
    message: "When many more investors apply, only some applications receive shares.",
  },
  {
    label: "Very high demand",
    multiple: "58x",
    allotted: 3,
    tone: "red",
    message: "In heavy oversubscription, allotment chances can become much lower.",
  },
];

export default function AllotmentExplainer() {
  const [active, setActive] = useState(1);
  const shouldReduceMotion = useReducedMotion();
  const scenario = scenarios[active];
  const tickets = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);

  return (
    <section className="learn-section learn-allotment-section" id="allotment">
      <div className="shell learn-allotment-grid">
        <motion.div
          className="learn-section-copy"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.45 }}
        >
          <span className="learn-section-kicker">03 · How allotment works</span>
          <h2>Applying for an IPO does not always mean you get shares.</h2>
          <p>
            After an IPO closes, applications are checked category-wise. If demand is higher than shares available, the
            registrar follows allotment rules and many investors may receive a refund instead of shares.
          </p>

          <div className="learn-allotment-controls" role="group" aria-label="Allotment demand examples">
            {scenarios.map((item, index) => (
              <button
                className={active === index ? `active ${item.tone}` : ""}
                key={item.label}
                onClick={() => setActive(index)}
                type="button"
              >
                <strong>{item.multiple}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className={`learn-allotment-readout ${scenario.tone}`}>
            <FileCheck2 size={20} />
            <div>
              <strong>{scenario.multiple} subscription example</strong>
              <p>{scenario.message} This is a simplified education view, not a prediction.</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="learn-allotment-stage"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="learn-allotment-glow" />
          <div className="learn-allotment-machine">
            <div className="learn-machine-top">
              <span>
                <UsersRound size={15} />
                Retail applications
              </span>
              <strong>{scenario.multiple}</strong>
            </div>

            <div className="learn-ticket-field" aria-label="Animated IPO application tickets">
              {tickets.map((ticket) => {
                const isAllotted = ticket < scenario.allotted;

                return (
                  <motion.span
                    className={isAllotted ? "allotted" : "waiting"}
                    key={`${scenario.multiple}-${ticket}`}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.84 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: ticket * 0.012, duration: 0.22 }}
                  >
                    <Ticket size={14} />
                  </motion.span>
                );
              })}
            </div>

            <div className="learn-registrar-engine">
              <div className="learn-engine-ring">
                <RotateCcw size={26} />
              </div>
              <div>
                <span>Registrar checks category, valid bids and demand</span>
                <strong>Allotment engine</strong>
              </div>
            </div>

            <div className="learn-allotment-lanes">
              <div className="success">
                <CheckCircle2 size={18} />
                <span>Shares allotted</span>
                <strong>{scenario.allotted}</strong>
              </div>
              <div className="refund">
                <XCircle size={18} />
                <span>Refund / no shares</span>
                <strong>{24 - scenario.allotted}</strong>
              </div>
            </div>
          </div>

          <div className="learn-allotment-card">
            <BadgeIndianRupee size={18} />
            <p>
              In oversubscribed IPOs, money is blocked during application and released if shares are not allotted.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
