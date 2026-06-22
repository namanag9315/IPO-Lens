"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { frameworkQuestions } from "@/lib/learn-content";

type Answer = "yes" | "no";

function getResult(answers: Record<number, Answer>) {
  const answered = Object.keys(answers).length;
  const yesCount = Object.values(answers).filter((answer) => answer === "yes").length;

  if (answered < frameworkQuestions.length) {
    return {
      tone: "neutral",
      title: "Complete the checklist",
      body: "Answer each question to see a beginner-friendly research comfort signal.",
    };
  }

  if (yesCount >= 6) {
    return {
      tone: "green",
      title: "Research looks comfortable",
      body: "Your answers suggest you have checked the basics. Still review official documents and risks before deciding.",
    };
  }

  if (yesCount >= 4) {
    return {
      tone: "amber",
      title: "Need more caution",
      body: "Some important areas need more research. Slow down and verify the missing pieces.",
    };
  }

  return {
    tone: "red",
    title: "Avoid applying blindly",
    body: "Too many basics are unclear. This is a signal to research more, not a recommendation.",
  };
}

export default function ApplyFramework() {
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const shouldReduceMotion = useReducedMotion();
  const result = useMemo(() => getResult(answers), [answers]);

  return (
    <section className="learn-section learn-framework-section" id="apply-framework">
      <div className="shell learn-framework-grid">
        <motion.div
          className="learn-framework-copy"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
        >
          <span className="learn-section-kicker">08 · Apply or Avoid Framework</span>
          <h2>Should I apply for this IPO?</h2>
          <p>
            Use this as an educational checklist before you apply. It does not tell you what to buy, but it helps you
            avoid blind decisions.
          </p>
          <div className="learn-education-only">
            <AlertTriangle size={18} />
            This is only an educational checklist, not a recommendation.
          </div>
        </motion.div>

        <motion.div
          className="learn-framework-card"
          initial={shouldReduceMotion ? false : { opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="learn-framework-questions">
            {frameworkQuestions.map((question, index) => (
              <div className="learn-framework-question" key={question}>
                <span>{question}</span>
                <div role="group" aria-label={question}>
                  <button
                    className={answers[index] === "yes" ? "active yes" : ""}
                    onClick={() => setAnswers((prev) => ({ ...prev, [index]: "yes" }))}
                    type="button"
                  >
                    Yes
                  </button>
                  <button
                    className={answers[index] === "no" ? "active no" : ""}
                    onClick={() => setAnswers((prev) => ({ ...prev, [index]: "no" }))}
                    type="button"
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={`learn-framework-result ${result.tone}`}>
            {result.tone === "green" ? <CheckCircle2 size={22} /> : result.tone === "red" ? <XCircle size={22} /> : <HelpCircle size={22} />}
            <div>
              <strong>{result.title}</strong>
              <p>{result.body}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
