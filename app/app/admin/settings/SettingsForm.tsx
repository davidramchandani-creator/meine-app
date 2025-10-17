"use client";

import { useActionState, useState } from "react";
import type { ChangeEvent } from "react";
import { saveAdminSettings, SettingsFormState } from "./actions";
import styles from "../admin-shared.module.css";
import {
  WEEKDAY_LABELS_DE,
  WEEKDAY_ORDER,
  type WeekdayKey,
} from "@/lib/availability";

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
    weeklyAvailability: Record<
      WeekdayKey,
      { enabled: boolean; start: string; end: string }
    >;
  };
};

export function SettingsForm({ initial }: Props) {
  const [state, formAction] = useActionState(saveAdminSettings, initialState);
  const [availability, setAvailability] = useState(initial.weeklyAvailability);

  const handleToggle = (day: WeekdayKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled,
      },
    }));
  };

  const handleTimeChange =
    (day: WeekdayKey, field: "start" | "end") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setAvailability((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value,
        },
      }));
    };

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

      <div className={styles.formSection}>
        <h3 className={styles.subheading}>Generelle Verfügbarkeit</h3>
        <p className={styles.listSubtitle}>
          Aktiviere die Wochentage, an denen du Termine anbietest. Zeiten werden im 15-Minuten-Raster ausgewertet.
        </p>
        <div className={styles.availabilityGrid}>
          {WEEKDAY_ORDER.map((day) => {
            const entry = availability[day];
            const enabled = entry?.enabled ?? false;
            return (
              <div key={day} className={styles.availabilityRow}>
                <label className={styles.availabilityDay}>
                  <input
                    type="checkbox"
                    name={`availability.${day}.enabled`}
                    checked={enabled}
                    onChange={handleToggle(day)}
                  />
                  <span>{WEEKDAY_LABELS_DE[day]}</span>
                </label>
                <div className={styles.availabilityTimes}>
                  <input
                    type="time"
                    step={900}
                    name={`availability.${day}.start`}
                    value={entry?.start ?? ""}
                    onChange={handleTimeChange(day, "start")}
                    disabled={!enabled}
                    required={enabled}
                  />
                  <span className={styles.availabilitySeparator}>–</span>
                  <input
                    type="time"
                    step={900}
                    name={`availability.${day}.end`}
                    value={entry?.end ?? ""}
                    onChange={handleTimeChange(day, "end")}
                    disabled={!enabled}
                    required={enabled}
                  />
                </div>
              </div>
            );
          })}
        </div>
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
