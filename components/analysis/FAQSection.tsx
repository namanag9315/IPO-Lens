"use client";

const faqs = [
  {
    answer: "GMP is an unofficial grey market premium before listing. It can help read sentiment, but it is not official and does not guarantee listing gains.",
    question: "What is GMP?",
  },
  {
    answer: "Subscription shows how many shares investors applied for compared with shares available. Higher subscription usually means stronger demand.",
    question: "What does subscription mean?",
  },
  {
    answer: "The registrar finalizes allotment based on valid applications, reserved category shares, cancellations and the basis of allotment.",
    question: "How is allotment decided?",
  },
  {
    answer: "If retail subscription is very high, many valid applications compete for limited retail shares, so the estimated chance falls.",
    question: "Why is my allotment chance so low?",
  },
  {
    answer: "For SME IPOs, the lead manager's past issue quality, listing performance and liquidity history can reveal extra risk.",
    question: "Why does lead manager matter for SME IPOs?",
  },
  {
    answer: "Read the RHP, financials, objects of issue, risk factors, registrar details, subscription data and source documents before forming a view.",
    question: "What should I read before applying?",
  },
];

export default function FAQSection() {
  return (
    <div className="analysis-faq-list">
      {faqs.map((faq) => (
        <details key={faq.question}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
