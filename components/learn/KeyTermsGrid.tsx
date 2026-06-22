"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  BadgeIndianRupee,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Landmark,
  ScrollText,
  Tags,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import LearnButton from "@/components/learn/LearnButton";
import { keyTerms } from "@/lib/learn-content";

const iconMap = {
  wallet: WalletCards,
  tags: Tags,
  boxes: Boxes,
  activity: Activity,
  users: UsersRound,
  user: UserRound,
  landmark: Landmark,
  briefcase: BriefcaseBusiness,
  check: CheckCircle2,
  trending: TrendingUp,
  file: FileText,
  scroll: ScrollText,
};

export default function KeyTermsGrid() {
  const [openTerm, setOpenTerm] = useState<string | null>("gmp");
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="learn-section" id="key-terms">
      <div className="shell">
        <div className="learn-section-head">
          <span className="learn-section-kicker">04 · Key IPO Terms</span>
          <h2>Simple words you will see on every IPO page</h2>
          <p>Tap a card to expand it. The goal is not to memorize terms, but to understand what each signal tells you.</p>
        </div>

        <motion.div
          className="learn-terms-grid"
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.12 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.045 } },
          }}
        >
          {keyTerms.map((term) => {
            const Icon = iconMap[term.icon as keyof typeof iconMap] ?? BadgeIndianRupee;
            const isOpen = openTerm === term.id;

            return (
              <motion.article
                className={`learn-term-card ${term.warning ? "warning" : ""}`}
                id={term.id}
                key={term.id}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  show: { opacity: 1, y: 0 },
                }}
                whileHover={shouldReduceMotion ? undefined : { y: -5, rotateX: 1.8, rotateY: -1.8 }}
              >
                <button
                  aria-expanded={isOpen}
                  className="learn-term-trigger"
                  onClick={() => setOpenTerm(isOpen ? null : term.id)}
                  type="button"
                >
                  <span className="learn-term-icon">
                    <Icon size={20} />
                  </span>
                  <strong>{term.title}</strong>
                </button>
                <p>{term.definition}</p>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      className="learn-term-expanded"
                      initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                    >
                      <span>Example: {term.example}</span>
                      {term.warning ? <em>{term.warning}</em> : null}
                      {term.topic ? <LearnButton topic={term.topic} variant="link" /> : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
