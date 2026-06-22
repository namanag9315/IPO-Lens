"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, GraduationCap, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { quizQuestions } from "@/lib/learn-content";

export default function LearnQuiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const shouldReduceMotion = useReducedMotion();
  const score = useMemo(
    () => quizQuestions.reduce((sum, item, index) => sum + (answers[index] === item.answer ? 1 : 0), 0),
    [answers],
  );
  const complete = Object.keys(answers).length === quizQuestions.length;

  return (
    <section className="learn-section" id="quiz">
      <div className="shell">
        <div className="learn-section-head centered">
          <span className="learn-section-kicker">09 · Mini Quiz</span>
          <h2>Check your IPO basics in five questions</h2>
          <p>Quick, simple and built for beginners. No finance degree required.</p>
        </div>

        <motion.div
          className="learn-quiz-card"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          {quizQuestions.map((item, index) => {
            const selected = answers[index];
            const isCorrect = selected === item.answer;

            return (
              <div className="learn-quiz-question" key={item.question}>
                <h3>
                  <span>{index + 1}</span>
                  {item.question}
                </h3>
                <div className="learn-quiz-options" role="group" aria-label={item.question}>
                  {item.options.map((option) => (
                    <button
                      className={selected === option ? "active" : ""}
                      key={option}
                      onClick={() => setAnswers((prev) => ({ ...prev, [index]: option }))}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {selected ? (
                  <div className={`learn-quiz-explanation ${isCorrect ? "correct" : "wrong"}`}>
                    {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {item.explanation}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="learn-quiz-score">
            <div>
              <GraduationCap size={24} />
              <strong>Your IPO learning score: {score}/5</strong>
              <p>{complete ? "Nice. You now know the key beginner signals to check." : "Answer all questions to complete the quiz."}</p>
            </div>
            <Link href="/#ipos">Now research live IPOs on IPO Lens</Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
