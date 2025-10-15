"use client";

import { useState, useTransition } from "react";
import { buyPackage } from "./actions";
import styles from "../student-dashboard.module.css";

type PackageOption = {
  id: "10" | "20";
  title: string;
  description: string;
  priceLabel: string;
};

type Props = {
  options: PackageOption[];
  disabled: boolean;
};

export function PackagePurchase({ options, disabled }: Props) {
  const [open, setOpen] = useState<PackageOption | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const closeModal = () => {
    setOpen(null);
    setAcceptTerms(false);
    setError(null);
  };

  const handleConfirm = () => {
    if (!open) return;
    setError(null);
    startTransition(async () => {
      const result = await buyPackage(open.id);
      if (!result.ok) {
        setError(result.error ?? "Das Paket konnte nicht gekauft werden.");
        return;
      }
      closeModal();
    });
  };

  return (
    <>
      <div className={styles.packages}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.packageLink}
            disabled={disabled || isPending}
            onClick={() => {
              setAcceptTerms(false);
              setError(null);
              setOpen(option);
            }}
          >
            <div className={styles.packageLinkContent}>
              <div className={styles.packageLinkMain}>
                <div className={styles.packageLinkTitle}>{option.title}</div>
                <div className={styles.packageLinkNote}>{option.description}</div>
              </div>
              <div className={styles.packageLinkAside}>
                <div className={styles.packageLinkPriceWrap}>
                  <div className={styles.packageLinkPrice}>{option.priceLabel}</div>
                  <div className={styles.packageLinkPriceSmall}>pro Lektion</div>
                </div>
                <span className={styles.packageLinkArrow} aria-hidden>
                  →
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {open ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className={styles.modalTitle}>{open.title} buchen</h2>
            <p className={styles.modalBody}>
              Mit diesem Paket erhältst du {open.title.replace("er Paket", "")}{" "}
              Lektionen. Der Betrag wird ausserhalb der App abgerechnet.
            </p>
            <label className={styles.modalCheckbox}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
              />
              <span>
                Ich akzeptiere die Buchungsbedingungen und bestätige, dass der
                Betrag fällig ist.
              </span>
            </label>
            {error ? <p className={styles.modalError}>{error}</p> : null}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={handleConfirm}
                disabled={!acceptTerms || isPending}
              >
                Paket aktivieren
              </button>
              <button
                type="button"
                className={styles.modalSecondary}
                onClick={closeModal}
                disabled={isPending}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
