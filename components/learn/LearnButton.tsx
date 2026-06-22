"use client";

import { BookOpen, Info } from "lucide-react";
import { useState } from "react";
import LearnDrawer from "@/components/learn/LearnDrawer";
import { learnTopics, type LearnTopic } from "@/lib/learn-topics";

export type { LearnTopic };

export type LearnButtonProps = {
  topic: LearnTopic;
  variant?: "icon" | "pill" | "link";
  size?: "sm" | "md";
};

export default function LearnButton({ topic, variant = "pill", size = "sm" }: LearnButtonProps) {
  const [open, setOpen] = useState(false);
  const isIcon = variant === "icon";
  const Icon = isIcon ? Info : BookOpen;
  const content = learnTopics[topic];

  return (
    <>
      <button
        aria-label={`Learn: ${content.title}`}
        className={`learn-button learn-button-${variant} learn-button-${size}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Icon size={size === "sm" ? 14 : 16} />
        {!isIcon ? <span>Learn</span> : null}
      </button>
      <LearnDrawer onClose={() => setOpen(false)} open={open} topic={topic} />
    </>
  );
}
