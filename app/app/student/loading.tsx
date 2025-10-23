export default function StudentAreaLoading() {
  return (
    <section className="page-loading" aria-label="Lade Schülerbereich">
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "45%" }} />
        <div className="skeleton skeleton--md" style={{ width: "90%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "55%" }} />
      </div>
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "60%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "70%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "65%" }} />
      </div>
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "50%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "85%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "40%" }} />
      </div>
    </section>
  );
}
