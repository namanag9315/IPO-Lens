"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  FileText,
  IndianRupee,
  Landmark,
  MousePointerClick,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { heroTrustChips } from "@/lib/learn-content";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function LearnHero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="learn-hero">
      <div className="learn-hero-glow learn-hero-glow-blue" />
      <div className="learn-hero-glow learn-hero-glow-green" />

      <div className="shell learn-hero-grid">
        <motion.div
          className="learn-hero-copy"
          initial={shouldReduceMotion ? false : "hidden"}
          animate="show"
          variants={stagger}
        >
          <motion.div className="learn-eyebrow" variants={fadeUp}>
            <Sparkles size={16} />
            Visual IPO school by IPO Lens
          </motion.div>

          <motion.h1 variants={fadeUp}>Master IPO Investing Step by Step</motion.h1>
          <motion.p variants={fadeUp}>
            Everything a retail investor needs to know about IPOs — explained in simple language with real examples,
            visual guides and risk warnings.
          </motion.p>
          <motion.p className="learn-hero-subnote" variants={fadeUp}>
            No finance textbook energy. Just a guided scroll story that shows what happens from DRHP to allotment to
            listing day.
          </motion.p>

          <motion.div className="learn-hero-actions" variants={fadeUp}>
            <a className="learn-primary-cta" href="#what-is-ipo">
              Start Learning
              <ArrowRight size={17} />
            </a>
            <a className="learn-secondary-cta" href="#ipo-journey">
              <PlayCircle size={18} />
              Watch Quick Guide
            </a>
          </motion.div>

          <motion.div className="learn-trust-chips" variants={stagger}>
            {heroTrustChips.map((chip) => (
              <motion.span key={chip} variants={fadeUp}>
                <BadgeCheck size={14} />
                {chip}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          aria-label="3D IPO learning illustration"
          className="learn-hero-visual"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 26, rotateX: 8, rotateY: -8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="learn-hero-stage-grid" />
          <div className="learn-visual-orbit learn-visual-orbit-one">
            <BookOpen size={18} />
            Learn
          </div>
          <div className="learn-visual-orbit learn-visual-orbit-two">
            <ShieldCheck size={18} />
            Understand
          </div>
          <div className="learn-visual-orbit learn-visual-orbit-three">
            <TrendingUp size={18} />
            Invest Wisely
          </div>

          <div className="learn-ipo-card-3d">
            <div className="learn-card-topline">
              <span>IPO Lens Learn OS</span>
              <span>Beginner mode</span>
            </div>
            <div className="learn-hero-dashboard">
              <div className="learn-document-panel">
                <FileText size={22} />
                <span>DRHP / RHP</span>
                <strong>Read the story</strong>
              </div>
              <div className="learn-price-panel">
                <IndianRupee size={22} />
                <span>Price band</span>
                <strong>₹120 - ₹125</strong>
              </div>
              <div className="learn-demand-panel">
                <UsersRound size={22} />
                <span>Subscription</span>
                <strong>7.2x</strong>
              </div>
            </div>

            <div className="learn-chart-card">
              <div className="learn-chart-bars">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>+18%</strong>
                <small>market sentiment</small>
              </div>
            </div>
            <div className="learn-rupee-coin">
              <IndianRupee size={32} />
            </div>
            <div className="learn-allotment-ticket ticket-a">
              <MousePointerClick size={16} />
              Apply
            </div>
            <div className="learn-allotment-ticket ticket-b">
              <Landmark size={16} />
              Allotment
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
