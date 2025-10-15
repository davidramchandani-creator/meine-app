"use client";

import { useActionState } from "react";
import { saveAdminSettings, SettingsFormState } from "./actions";
import styles from "../admin-shared.module.css";

const initialState: SettingsFormState = { ok: false };

type Props = {
  initial: {
    startAddress: string;
    defaultDuration: number;
    bufferMinutes: number;
    cancelWindow: number;
    startLat: number | null;
    startLng: number | null;
    updatedAt: string | null;
  };
};

export function SettingsForm({ initial }: Props) {
  const [state, formAction] = useActionState(saveAdminSettings, initialState);

  return (
    <form className={styles.form} action={formAction}>
      <label className={styles.label}>
        Startadresse
        <textarea
          className={styles.input}
          name="startAddress"
          defaultValue={initial.startAddress}
          placeholder="Sattleracherstrasse 59, 8413 Neftenbach"
          rows={2}
          required
        />
      </label>

      <div className={styles.inlineFields}>
        <label className={styles.label}>
          Standarddauer (Minuten)
          <input
            className={styles.input}
            name="defaultDuration"
            type="number"
            min={1}
            defaultValue={initial.defaultDuration}
            required
          />
        </label>
        <label className={styles.label}>
          Zeitpuffer (Minuten)
          <input
            className={styles.input}
            name="bufferMinutes"
            type="number"
            min={0}
            defaultValue={initial.bufferMinutes}
            required
          />
        </label>
        <label className={styles.label}>
          Storno-Fenster (Stunden)
          <input
            className={styles.input}
            name="cancelWindow"
            type="number"
            min={0}
            defaultValue={initial.cancelWindow}
            required
          />
        </label>
      </div>

      <div className={styles.listMeta}>
        <span className={styles.listSubtitle}>
          Geokoordinaten: {initial.startLat ?? "?"}, {initial.startLng ?? "?"}
        </span>
        {initial.updatedAt ? (
          <span className={styles.listSubtitle}>
            Zuletzt aktualisiert: {new Date(initial.updatedAt).toLocaleString("de-CH")}
          </span>
        ) : null}
      </div>

      {state.error ? <p className={styles.placeholder}>{state.error}</p> : null}
      {state.ok ? (
        <p className={styles.listSubtitle}>Einstellungen gespeichert.</p>
      ) : null}

      <div className={styles.actions}>
        <button className={styles.actionButton} type="submit">
          Speichern
        </button>
      </div>
    </form>
  );
}
