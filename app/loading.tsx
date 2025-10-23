export default function RootLoading() {
  return (
    <main className="page-loading" aria-label="Lade Seite">
      <div className="skeleton skeleton--lg" />
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "50%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "80%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "65%" }} />
      </div>
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "40%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "75%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "55%" }} />
      </div>
    </main>
  );
}
