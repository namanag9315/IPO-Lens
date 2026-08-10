import type { AllotmentCheckResponse } from "@/lib/allotment/types";

function statusCopy(status: AllotmentCheckResponse["status"]) {
  switch (status) {
    case "ALLOTTED":
      return "Allotted";
    case "NOT_ALLOTTED":
      return "Not allotted";
    case "PENDING":
      return "Pending";
    case "UNAVAILABLE":
      return "Unavailable";
    default:
      return "Error";
  }
}

export default function AllotmentResultCard({ result }: { result: AllotmentCheckResponse | null }) {
  if (!result) {
    return (
      <div className="premium-card allotment-result-card empty">
        <span className="allotment-card-label">Result</span>
        <p>Submit a manual check to see allotment status, masked identifiers, source, and official next step.</p>
      </div>
    );
  }

  return (
    <div className={`premium-card allotment-result-card ${result.status.toLowerCase()}`}>
      <div className="allotment-result-top">
        <div>
          <span className="allotment-card-label">Allotment result</span>
          <h3>{statusCopy(result.status)}</h3>
          <p>{result.message}</p>
        </div>
        <span className={`allotment-status-pill ${result.status.toLowerCase()}`}>{result.status.replace("_", " ")}</span>
      </div>
      <div className="allotment-result-grid">
        <div>
          <span>IPO</span>
          <strong>{result.ipoName}</strong>
        </div>
        <div>
          <span>Investor</span>
          <strong>{result.investorName ?? "Not disclosed"}</strong>
        </div>
        <div>
          <span>Shares</span>
          <strong className="mono">{result.allottedShares ?? "NA"}</strong>
        </div>
        <div>
          <span>Masked PAN</span>
          <strong className="mono">{result.panMasked ?? "NA"}</strong>
        </div>
        <div>
          <span>Application</span>
          <strong className="mono">{result.applicationNumberMasked ?? "NA"}</strong>
        </div>
        <div>
          <span>Checked</span>
          <strong className="mono">{new Date(result.checkedAt).toLocaleString("en-IN")}</strong>
        </div>
      </div>
      {result.fallbackAction ? (
        <a className="allotment-primary-link" href={result.fallbackAction.url} rel="noreferrer" target="_blank">
          {result.fallbackAction.label}
        </a>
      ) : null}
    </div>
  );
}
