"use client";

import React from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
}

export default function ScoreRing({ score, size = 48 }: ScoreRingProps) {
  const radius = 19;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius; // ~119.38
  const strokeDashoffset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  // Color selection based on thresholds
  let strokeColor = "#639922";
  let bgClass = "fill-[#EAF3DE]";
  let textClass = "fill-[#3B6D11]";

  if (score >= 70) {
    strokeColor = "#639922";
    bgClass = "fill-[#EAF3DE]";
    textClass = "fill-[#3B6D11]";
  } else if (score >= 40) {
    strokeColor = "#BA7517";
    bgClass = "fill-[#FAEEDA]";
    textClass = "fill-[#854F0B]";
  } else {
    strokeColor = "#A32D2D";
    bgClass = "fill-[#FCEBEB]";
    textClass = "fill-[#791F1F]";
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 48 48"
        className="transform -rotate-90"
        aria-label={`Score: ${score} out of 100`}
      >
        {/* Background circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          className={`${bgClass} transition-colors duration-200`}
        />
        
        {/* Track circle */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-200"
          strokeWidth={strokeWidth}
        />

        {/* Progress stroke */}
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Centered Score text */}
      <span
        className={`absolute text-xs font-bold transition-colors duration-200 ${textClass.replace("fill-", "text-")}`}
        style={{ fontSize: size * 0.28 }}
      >
        {score}
      </span>
    </div>
  );
}
