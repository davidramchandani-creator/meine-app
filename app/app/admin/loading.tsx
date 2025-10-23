export default function AdminAreaLoading() {
  return (
    <section className="page-loading" aria-label="Lade Admin-Bereich">
      <div className="skeleton skeleton--lg" style={{ width: "60%" }} />
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "70%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "65%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "80%" }} />
      </div>
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "50%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "75%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "55%" }} />
      </div>
    </section>
  );
}
