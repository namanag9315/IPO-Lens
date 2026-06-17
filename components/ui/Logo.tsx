export default function Logo({ className = "", size = 36 }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      className={className}
      fill="none"
      style={{ color: "var(--ink)" }}
    >
      {/* Magnifying Glass Circle */}
      <path 
        d="M 78 61 A 36 36 0 1 1 68 18" 
        stroke="currentColor" 
        strokeWidth="7" 
        strokeLinecap="round" 
      />
      
      {/* Magnifying Glass Handle */}
      <line 
        x1="70" y1="70" 
        x2="88" y2="88" 
        stroke="currentColor" 
        strokeWidth="10" 
        strokeLinecap="round" 
      />
      
      {/* Left Candlestick (Navy) */}
      <line x1="26" y1="42" x2="26" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="21" y="47" width="10" height="10" fill="currentColor" rx="1.5" />
      
      {/* Middle Candlestick (Blue) */}
      <line x1="45" y1="32" x2="45" y2="55" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
      <rect x="40" y="38" width="10" height="14" fill="#2563eb" rx="1.5" />
      
      {/* Right Candlestick (Green) */}
      <line x1="64" y1="22" x2="64" y2="48" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
      <rect x="59" y="28" width="10" height="16" fill="#10b981" rx="1.5" />
      
      {/* Trend Arrow Line (Blue) */}
      <path 
        d="M 12 68 L 34 52 L 52 66 L 86 32" 
        stroke="#2563eb" 
        strokeWidth="4.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Trend Arrow Head */}
      <polygon 
        points="78,30 92,26 88,40" 
        fill="#2563eb" 
      />
    </svg>
  );
}
