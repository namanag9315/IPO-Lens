"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, BookOpen, Lightbulb, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { learnTopics, type LearnTopic } from "@/lib/learn-topics";

interface LearnDrawerProps {
  onClose: () => void;
  open: boolean;
  topic: LearnTopic;
}

export default function LearnDrawer({ onClose, open, topic }: LearnDrawerProps) {
  const shouldReduceMotion = useReducedMotion();
  const content = learnTopics[topic];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("no-scroll");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          aria-modal="true"
          className="learn-drawer-shell"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0 }}
          role="dialog"
        >
          <button aria-label="Close learning panel" className="learn-drawer-backdrop" onClick={onClose} />
          <motion.div
            className="learn-drawer-panel"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="learn-drawer-head">
              <span className="learn-drawer-kicker">
                <BookOpen size={14} />
                IPO Lens Learn
              </span>
              <button aria-label="Close" className="learn-drawer-close" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="learn-drawer-icon">
              <Lightbulb size={24} />
            </div>
            <h2>{content.title}</h2>
            <p className="learn-drawer-definition">{content.shortDefinition}</p>

            <div className="learn-drawer-block">
              <strong>Why it matters</strong>
              <p>{content.whyItMatters}</p>
            </div>

            <div className="learn-drawer-warning">
              <AlertTriangle size={17} />
              <p>{content.warning}</p>
            </div>

            <Link className="learn-drawer-cta" href={content.learnPageAnchor} onClick={onClose}>
              Learn more about IPO terms
            </Link>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
