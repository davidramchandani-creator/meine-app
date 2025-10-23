export default function StudentLessonsLoading() {
  return (
    <section className="page-loading" aria-label="Lade Lektionen">
      <div className="skeleton skeleton--lg" style={{ width: "70%" }} />
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "55%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "80%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "65%" }} />
      </div>
      <div className="card-skeleton">
        <div className="skeleton skeleton--sm" style={{ width: "50%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "75%" }} />
        <div className="skeleton skeleton--sm" style={{ width: "60%" }} />
      </div>
    </section>
  );
}
