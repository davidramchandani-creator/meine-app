# Buchungssystem – Funktions- und Prozessbeschreibung

Dieses Dokument fasst die Zielarchitektur für das Buchungs- und Vorschlagswesen zusammen. Es dient als Arbeitsgrundlage für die Umsetzung in Supabase und der Next.js-App.

## Übersicht & Zielbild

- **Requests (`booking_requests`)** bilden alle offenen Vorschläge oder Anfragen ab – unabhängig davon, ob sie vom Schüler oder vom Admin gestartet wurden.
- **Lessons (`lessons`)** repräsentieren fix gebuchte Termine.
- **Credits (`student_packages`)** werden erst beim erfolgreichen Annehmen (Lesson-Erstellung) reduziert.
- **Rollen**
  - *Student* – sieht ausschließlich eigene Daten, kann Buchungsanfragen starten, Admin-Vorschläge annehmen/ablehnen/gegenschlagen, Stammdaten pflegen.
  - *Admin* – hat Vollzugriff: kann Vorschläge senden, Requests bearbeiten, Lessons erstellen/ändern, Credits manuell anpassen.

## Datenmodelle & Status

### `booking_requests`

| Feld | Beschreibung |
| ---- | ------------ |
| `direction` | `student_to_admin` oder `admin_to_student` |
| `status` | `pending` → `accepted`/`declined`/`expired` |
| `kind` | `booking` (neue Buchung) oder `reschedule` (Verschiebung) |
| `lesson_id` | optional, verweist bei Verschiebungen auf die bestehende Lesson |
| `counter_of` | Referenz auf ursprünglichen Request (bei Gegenvorschlag) |
| `proposed_starts_at`, `proposed_ends_at` | vorgeschlagenes Zeitfenster |
| `message` | optionale Nachricht |
| `requester_id` | wer den Request erstellt hat (Admin/Student) |

**Expiry**: Requests können automatisiert auf `expired` gesetzt werden, wenn `proposed_starts_at < now()` (z. B. per geplanter Function).

### `lessons`

| Feld | Beschreibung |
| ---- | ------------ |
| `status` | `booked` → `completed` / `cancelled` |
| `starts_at`, `ends_at` | Standard 45 Minuten Dauer |
| `student_package_id` | optional, verweist auf genutztes Paket |

**Collision Policy**: Keine Überschneidung (`starts_at`/`ends_at`) pro `student_id`. Später erweiterbar auf Lehrer/Slots.

### `student_packages` / Credits

- `lessons_total`, `lessons_used`, `status`
- Beim Annehmen einer Buchung (Lesson-Erstellung) → `lessons_used + 1`.
- Falls kein aktives Paket vorhanden:
  - Buchung zulassen, Lesson als „ohne Paket“ markieren (`student_package_id = null`).
  - (Alternativ später: Blockieren ohne Paket, bei Bedarf Flag umstellen.)
- Paketkauf (10er/20er) erzeugt einen neuen Datensatz mit `status = 'active'`, `lessons_used = 0`. Aktive Pakete ohne Rest-Credits werden vorab auf `completed` gesetzt.

### View `v_student_current_package`

- Liefert pro Schüler das aktive Paket inkl. `lessons_left`, `next_lesson_at`.
- Beispiel-SQL im README.

## Kernprozesse

### A) Student → Admin (Buchung anfragen)

1. Student erstellt Request (`direction = student_to_admin`, `status = pending`).
2. Admin sieht Request in der Inbox.
3. Admin-Optionen:
   - **Annehmen** → Lesson erstellen, Credit abbuchen (falls Paket).
   - **Ablehnen** → Request `declined`.
   - **Vorschlag zurück** → neuer `admin_to_student`-Request (siehe Flow B).

### B) Admin → Student (Vorschlag senden)

1. Admin erstellt Request (`direction = admin_to_student`, `status = pending`).
2. Student-Optionen:
   - **Annehmen** → Lesson + Credit −1.
   - **Ablehnen** → Request `declined`.
   - **Gegenvorschlag** → neuer `student_to_admin` Request, `counter_of` zeigt auf ursprünglichen Vorschlag; Original optional `declined`.

### C) Kollisionen

- Vor der Lesson-Erstellung prüfen: existiert eine Lesson des Schülers, deren Zeitfenster kollidiert?
- Fehlermeldung mit konkretem Slot: „Kollision mit 15.10. 18:00–18:45“.

### D) Stornieren & Verschieben

- **Verschiebungen** laufen ebenfalls über `booking_requests` (mit `kind = 'reschedule'` und `lesson_id`). Nach Annahme wird die bestehende Lesson auf das neue Zeitfenster gesetzt.
- **Stornierungen**:
  - Schüler:innen können nur bis 24 h vor Beginn stornieren und müssen einen Grund angeben. Lesson wird direkt auf `cancelled` gesetzt (`cancellation_reason`, `cancelled_at`, `cancelled_by`).
  - Admins können unabhängig vom Zeitfenster stornieren oder Lessons direkt verschieben.

## UX-Leitlinien

### Student-App

- **Home**: Credits-Karte, nächster Termin, Badge mit offenen Vorschlägen.
- **Lektionen**: Liste zukünftiger Lessons mit Aktionen (*Verschiebung anfragen*, *Stornieren*). Pending-Verschiebungen werden hervorgehoben.
- **Vorschläge**: Admin→Student Requests (pending) mit Aktionen *Annehmen / Ablehnen / Gegenvorschlag*.
- **Profil**: Stammdaten (Adresse für Wegkosten), Zahlungen, Logout.
- **FAB „Buchen“**: simples Formular (Start/Ende, Notiz) → erstellt `student_to_admin` Request.

### Admin-Portal

- **Overview**: Kennzahlen (offene student→admin Requests, Lessons heute/morgen, offene Zahlungen) + Quick Actions.
- **Schüler**: Liste mit Credits, nächster Termin, Button „Vorschlag senden“.
- **Anfragen**: student→admin Requests (inkl. Gegenvorschläge via `counter_of`), Aktionen: *Annehmen*, *Ablehnen*, *Vorschlag zurück*. Verschiebungen sind klar markiert und aktualisieren bestehende Lessons.
- **Kalender**: Übersicht geplanter Lessons, Konflikte sichtbar machen.
- **Zahlungen**: pending/paid/refunded, Link zur Quittung.
- **Einstellungen**: Standardparameter (Startadresse, Dauer 45 min, Puffer 30 min, Lead/Cancel Window) sowie generelle Verfügbarkeiten (Wochentage & Zeitfenster), die das Buchungssystem verwenden soll.

## Geschäftsregeln & Policies

- **Dauer**: Default 45 Minuten je Lesson.
- **Puffer**: 30 Minuten zwischen Lessons (hart geprüft bei Vorschlägen/Buchungen).
- **Lead Time**: Buchungen min. 6 Stunden im Voraus.
- **Storno-Regel**: Schüler-Storno nur > 24 h vor Beginn.
- **Zeitzone**: UTC speichern, Anzeige in `Europe/Zurich`.
- **Verfügbarkeiten**: Buchungs- und Vorschlagzeiten müssen in den unter `admin_settings.weekly_availability` hinterlegten Zeitfenstern liegen.
- **Credits**: nur beim Annehmen abbuchen (Lesson-Erstellung).

## Supabase & Sicherheit

- **RLS**: Studenten nur Zugriff auf eigene Datensätze (`student_id = auth.uid()`), Admins über Profile (`role = 'admin'`).
- **Server-Actions**: Für Lesson-Erstellung, Credits-Update, Request-Statuswechsel den Service-Role-Key (`supabaseService`) nutzen.
- **Expiry & Cron**: Optional geplante Functions, die überfällige Requests automatisch auf `expired` setzen.
- **Schema-Erweiterungen**: `booking_requests.kind`, `booking_requests.lesson_id`, `lessons.cancellation_reason`, `lessons.cancelled_at`, `lessons.cancelled_by`, `admin_settings.weekly_availability` (JSON pro Wochentag mit Zeitfenstern, z. B. `{ "monday": [{ "start": "14:00", "end": "18:00" }] }`).

## Backlog & Erweiterungen

1. Stripe/Twint Checkout + Webhooks → automatisierte Pakete/Payments.
2. Wegkostenrechner (Adresse → km → Zuschlag).
3. Drag&Drop-Kalender für Admin, Konfliktvisualisierung.
4. Notifications (E-Mail/SMS) für neue Requests/Bestätigungen.
5. PDF-Belege/Exports.
