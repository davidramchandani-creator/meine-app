"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./admin-students.module.css";
import type { StudentOverviewCard } from "./page";

type Filter = "all" | "lowCredits" | "withUpcoming";

function matchesFilter(student: StudentOverviewCard, filter: Filter) {
  switch (filter) {
    case "lowCredits":
      return student.creditsLeft > 0 && student.creditsLeft <= 3;
    case "withUpcoming":
      return student.nextLesson !== "Keine Lektion geplant";
    default:
      return true;
  }
}

export function StudentsOverview({ students }: { students: StudentOverviewCard[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<StudentOverviewCard | null>(null);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q);
      const matches = matchesQuery && matchesFilter(student, filter);
      return matches;
    });
  }, [students, query, filter]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.titleBar}>
          <h1 className={styles.title}>Schülerübersicht</h1>
          <span className={styles.count}>{students.length} Schüler:innen</span>
        </div>
        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nach Name oder E-Mail suchen"
              aria-label="Schüler suchen"
            />
          </label>
          <div className={styles.filters}>
            <button
              type="button"
              className={`${styles.filterChip} ${
                filter === "all" ? styles.filterChipActive : ""
              }`}
              onClick={() => setFilter("all")}
            >
              Alle
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${
                filter === "lowCredits" ? styles.filterChipActive : ""
              }`}
              onClick={() => setFilter("lowCredits")}
            >
              Wenige Credits
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${
                filter === "withUpcoming" ? styles.filterChipActive : ""
              }`}
              onClick={() => setFilter("withUpcoming")}
            >
              Kommende Termine
            </button>
          </div>
        </div>
      </header>

      {filteredStudents.length === 0 ? (
        <p className={styles.emptyState}>
          Keine passenden Schüler gefunden. Passe deine Suche oder Filter an.
        </p>
      ) : (
        <div className={styles.list}>
          {filteredStudents.map((student) => (
            <article key={student.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleGroup}>
                  <h2 className={styles.cardTitle}>{student.name}</h2>
                  <span className={styles.cardSubtitle}>{student.email}</span>
                </div>
                <span className={styles.statusBadge}>{student.statusLabel}</span>
              </div>

              <div className={styles.cardInfo}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{student.creditsLeft}</span>
                  <span className={styles.statLabel}>Credits frei</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{student.creditsUsed}</span>
                  <span className={styles.statLabel}>Gebucht</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {student.creditsTotal}
                  </span>
                  <span className={styles.statLabel}>Total</span>
                </div>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaChip}>{student.nextLesson}</span>
                {student.pricePerLessonLabel ? (
                  <span className={styles.metaChip}>
                    {student.pricePerLessonLabel}
                  </span>
                ) : null}
                {student.travelFeeLabel ? (
                  <span className={styles.metaChip}>
                    {student.travelFeeLabel}
                  </span>
                ) : null}
                {student.travelDistanceLabel ? (
                  <span className={styles.metaChip}>
                    {student.travelDistanceLabel}
                  </span>
                ) : null}
              </div>

              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => setSelected(student)}
                >
                  Details
                </button>
                <Link
                  className={styles.secondaryAction}
                  href={`/app/admin/requests/new?student=${student.id}`}
                >
                  Vorschlag senden
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{selected.name}</h2>
                <span className={styles.cardSubtitle}>{selected.email}</span>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Modal schließen"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.cardInfo}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{selected.creditsLeft}</span>
                <span className={styles.statLabel}>Credits frei</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{selected.creditsUsed}</span>
                <span className={styles.statLabel}>Gebucht</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {selected.creditsTotal}
                </span>
                <span className={styles.statLabel}>Total</span>
              </div>
            </div>

            <div className={styles.modalSections}>
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Paketstatus</h3>
                <p className={styles.modalLine}>
                  Credits verbleibend: {selected.creditsLeft} von{" "}
                  {selected.creditsTotal}
                </p>
                <p className={styles.modalLine}>
                  Verbrauchte Credits: {selected.creditsUsed}
                </p>
                {selected.pricePerLessonLabel ? (
                  <p className={styles.modalLine}>{selected.pricePerLessonLabel}</p>
                ) : null}
                {selected.travelFeeLabel ? (
                  <p className={styles.modalLine}>{selected.travelFeeLabel}</p>
                ) : null}
                {selected.travelDistanceLabel ? (
                  <p className={styles.modalLine}>
                    {selected.travelDistanceLabel}
                  </p>
                ) : null}
              </div>

              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Nächster Termin</h3>
                <p className={styles.modalLine}>{selected.nextLesson}</p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <Link
                className={styles.modalSecondaryAction}
                href={`/app/admin/requests/new?student=${selected.id}`}
              >
                Vorschlag senden
              </Link>
              <button
                type="button"
                className={styles.modalPrimaryAction}
                onClick={() => {
                  // Placeholder for future actions
                  setSelected(null);
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
