"use client";

import { motion, useScroll } from "framer-motion";
import { useEffect, useState } from "react";
import { learnProgressSections } from "@/lib/learn-content";

export default function LearnProgress() {
  const [activeId, setActiveId] = useState(learnProgressSections[0].id);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const section of learnProgressSections) {
      const element = document.getElementById(section.id);
      if (!element) {
        continue;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(section.id);
          }
        },
        {
          rootMargin: "-35% 0px -50% 0px",
          threshold: 0,
        },
      );

      observer.observe(element);
      observers.push(observer);
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <div className="learn-progress-wrap">
      <motion.div className="learn-progress-line" style={{ scaleX: scrollYProgress }} />
      <div className="shell learn-progress">
        {learnProgressSections.map((section, index) => {
          const isActive = activeId === section.id;

          return (
            <a aria-current={isActive ? "step" : undefined} className={isActive ? "active" : ""} href={`#${section.id}`} key={section.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {section.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
