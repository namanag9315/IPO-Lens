import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default function DisabledLiteEnginePage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Disabled"
        title="Engine Lite Archived"
        subtitle="The old lite parser/importer is quarantined during the clean IPO data-engine reset."
        actions={
          <Link className="ui-button ui-button-primary" href="/admin/data-engine">
            Open Clean Data Engine
          </Link>
        }
      />
      <section className="admin-panel">
        <h2>Old Engine Disabled</h2>
        <p className="admin-muted">
          This page no longer imports IPO Premium, AI enrichment, manual HTML mapping, or legacy source parsers. Use the clean engine flow: stage source records, match canonical IPOs, validate facts, then save to clean history/fact tables.
        </p>
      </section>
    </>
  );
}
