"use client";

import { useActionState } from "react";
import { updateProfile, ProfileFormState } from "./actions";
import styles from "./profile.module.css";

const initialState: ProfileFormState = { ok: false };

type Props = {
  initial: {
    firstName: string;
    lastName: string;
    addressLine: string;
    postalCode: string;
    city: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const [state, formAction] = useActionState(updateProfile, initialState);

  return (
    <form className={styles.form} action={formAction}>
      <label className={styles.label}>
        Vorname
        <input
          className={styles.input}
          name="firstName"
          defaultValue={initial.firstName}
          placeholder="Vorname"
          required
        />
      </label>
      <label className={styles.label}>
        Nachname
        <input
          className={styles.input}
          name="lastName"
          defaultValue={initial.lastName}
          placeholder="Nachname"
          required
        />
      </label>
      <label className={styles.label}>
        Strasse & Nr.
        <input
          className={styles.input}
          name="addressLine"
          defaultValue={initial.addressLine}
          placeholder="Sattleracherstrasse 59"
          required
        />
      </label>
      <div className={styles.inlineFields}>
        <label className={styles.label}>
          PLZ
          <input
            className={styles.input}
            name="postalCode"
            defaultValue={initial.postalCode}
            placeholder="8413"
            required
          />
        </label>
        <label className={styles.label}>
          Ort
          <input
            className={styles.input}
            name="city"
            defaultValue={initial.city}
            placeholder="Neftenbach"
            required
          />
        </label>
      </div>

      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.ok ? (
        <p className={styles.success}>Profil wurde gespeichert.</p>
      ) : null}

      <div className={styles.actions}>
        <button className={styles.primary} type="submit">
          Profil speichern
        </button>
      </div>
    </form>
  );
}
