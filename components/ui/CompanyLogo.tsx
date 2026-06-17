"use client";

import React, { useState } from "react";

interface CompanyLogoProps {
  domain?: string | null;
  name: string;
}

export default function CompanyLogo({ domain, name }: CompanyLogoProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [useInitials, setUseInitials] = useState(false);

  const initials = name
    .replace(/\b(IPO|Limited|Ltd)\b/gi, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (useInitials || !domain) {
    return <span className="flex items-center justify-center w-full h-full">{initials}</span>;
  }

  // Use the logo.dev API key or a default
  const logoKey = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY || "pk_cMveYtGPT96iwScpDI-uOA";
  
  const logoUrl = useFallback 
    ? `https://logo.clearbit.com/${domain}`
    : `https://img.logo.dev/${domain}?token=${logoKey}`;

  return (
    <>
      <img
        src={logoUrl}
        alt={name}
        className="absolute inset-0 w-full h-full rounded-full object-contain p-0.5 bg-white z-10"
        onError={() => {
          if (!useFallback) {
            setUseFallback(true);
          } else {
            setUseInitials(true);
          }
        }}
      />
      {/* Hidden fallback initials span so layout remains identical when loading/failed */}
      <span className="flex items-center justify-center w-full h-full" style={{ display: "none" }}>
        {initials}
      </span>
    </>
  );
}
