import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="analysis-page">
      <div className="shell analysis-shell">
        <section className="analysis-card analysis-empty-state">
          <span>Admin access</span>
          <h1>Unauthorized</h1>
          <p>You need an active admin role to access IPO Lens operations pages.</p>
          <Link className="ui-button ui-button-primary" href="/">
            Return home
          </Link>
        </section>
      </div>
    </main>
  );
}
