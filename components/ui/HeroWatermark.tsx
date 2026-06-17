import React from "react";

export default function HeroWatermark() {
  return (
    <div className="hero-watermark-bg" aria-hidden="true">
      <svg
        className="hero-watermark-svg"
        viewBox="0 0 1440 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Animated Grid Pattern */}
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        
        {/* Grid Background */}
        <rect width="100%" height="100%" fill="url(#grid)" className="grid-fill" />

        {/* Faint rising financial trendlines */}
        <path
          d="M-50 320 C 150 290, 250 150, 450 200 C 650 250, 750 100, 950 150 C 1150 200, 1250 80, 1490 60"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="8 6"
          className="trendline trendline-1"
        />

        <path
          d="M-50 250 C 100 200, 300 280, 500 120 C 700 80, 850 180, 1050 100 C 1250 50, 1350 110, 1490 30"
          stroke="currentColor"
          strokeWidth="2"
          className="trendline trendline-2"
        />

        {/* Floating Financial Candlesticks */}
        <g className="candlestick-group">
          {/* Candle 1 */}
          <line x1="200" y1="180" x2="200" y2="260" stroke="currentColor" strokeWidth="1" />
          <rect x="195" y="200" width="10" height="40" fill="currentColor" rx="2" className="candle-body" />

          {/* Candle 2 */}
          <line x1="380" y1="120" x2="380" y2="200" stroke="currentColor" strokeWidth="1" />
          <rect x="375" y="140" width="10" height="40" fill="currentColor" rx="2" className="candle-body" />

          {/* Candle 3 */}
          <line x1="600" y1="210" x2="600" y2="290" stroke="currentColor" strokeWidth="1" />
          <rect x="595" y="220" width="10" height="50" fill="currentColor" rx="2" className="candle-body" />

          {/* Candle 4 */}
          <line x1="820" y1="90" x2="820" y2="170" stroke="currentColor" strokeWidth="1" />
          <rect x="815" y="110" width="10" height="40" fill="currentColor" rx="2" className="candle-body" />

          {/* Candle 5 */}
          <line x1="1100" y1="140" x2="1100" y2="240" stroke="currentColor" strokeWidth="1" />
          <rect x="1095" y="160" width="10" height="60" fill="currentColor" rx="2" className="candle-body" />
        </g>

        {/* Floating/pulsing data points */}
        <g className="datapoints">
          <circle cx="450" cy="200" r="5" fill="currentColor" className="datapoint pulse-slow" />
          <circle cx="950" cy="150" r="4" fill="currentColor" className="datapoint pulse-fast" />
          <circle cx="500" cy="120" r="6" fill="currentColor" className="datapoint pulse-slow" />
          <circle cx="1050" cy="100" r="4" fill="currentColor" className="datapoint pulse-fast" />
        </g>
      </svg>
    </div>
  );
}
