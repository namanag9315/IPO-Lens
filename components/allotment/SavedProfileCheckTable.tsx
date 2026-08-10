import type { SavedProfileCheckResult } from "@/lib/allotment/types";

export default function SavedProfileCheckTable({ results }: { results: SavedProfileCheckResult[] }) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="table-wrap allotment-saved-results">
      <table>
        <thead>
          <tr>
            <th>Nickname</th>
            <th>Masked PAN</th>
            <th>Status</th>
            <th>Shares</th>
            <th>Source</th>
            <th>Checked at</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={`${result.panProfileId}-${result.checkedAt}`}>
              <td>{result.nickname}</td>
              <td className="mono">{result.panMasked}</td>
              <td>{result.status.replace("_", " ")}</td>
              <td className="mono">{result.allottedShares ?? "NA"}</td>
              <td>{result.source}</td>
              <td className="mono">{new Date(result.checkedAt).toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
