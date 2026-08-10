import { ExternalLink } from "lucide-react";
import { officialFallbackLinks } from "@/lib/allotment/registrarLinks";
import type { AllotmentRegistrar } from "@/lib/allotment/types";

interface AllotmentFallbackLinksProps {
  registrar: AllotmentRegistrar | null;
}

export default function AllotmentFallbackLinks({ registrar }: AllotmentFallbackLinksProps) {
  const links = officialFallbackLinks(registrar);

  return (
    <div className="premium-card allotment-fallback-card">
      <div className="allotment-card-head">
        <div>
          <span className="allotment-card-label">Official fallback links</span>
          <h3>Check directly on official sources</h3>
        </div>
      </div>
      <p>
        Automatic check is not available for every registrar yet. You can check directly on the official registrar, BSE, or NSE website.
      </p>
      <div className="allotment-link-grid">
        {links.map((link) => (
          <a href={link.url} key={link.url} rel="noreferrer" target="_blank">
            <span>
              <strong>{link.label}</strong>
              <small>{link.description}</small>
            </span>
            <ExternalLink size={15} />
          </a>
        ))}
      </div>
    </div>
  );
}
