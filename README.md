## Magic-Link Auth mit Supabase

Die Anwendung nutzt Supabase Auth mit Magic-Link-Anmeldung. Nach dem Login landen Nutzer:innen im geschützten Bereich unter `/app/student`. Admins erhalten zusätzlich Zugriff auf `/app/admin`.

### Voraussetzungen

Lege eine `.env.local` im Projektverzeichnis an und trage deine Supabase-Konfiguration ein:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_KEY"
```

> `SUPABASE_SERVICE_ROLE_KEY` wird nur serverseitig verwendet (z. B. für Admin-Aktionen). In Production sollte diese Variable ausschließlich als geschütztes Secret hinterlegt werden. `NEXT_PUBLIC_SITE_URL` setzt den Standard-Redirect für Logout und kann auf deine Produktions-URL zeigen.

Installiere anschließend die Abhängigkeiten und starte die App:

```bash
npm install
npm run dev
```

### Progressive Web App (PWA)

Die App ist für eine app-ähnliche Nutzung vorbereitet:

- Manifest & Icons liegen unter `app/manifest.ts` sowie `public/icon-*.png` und sorgen für Installierbarkeit.
- Ein Service Worker (`public/sw.js`) cached Seiten & Assets für Offline-Betrieb und navigiert bei fehlender Verbindung auf `/offline`.
- Die Registrierung erfolgt clientseitig über den `PwaInitializer` (`app/pwa/PwaInitializer.tsx`). Bei Updates löst er das DOM-Event `pwa:updateavailable` aus, auf das du mit eigenem UI reagieren kannst.

**Test-Tipps**

1. Produktion simulieren: `npm run build && npm run start`, anschließend `http://localhost:3000` im Browser öffnen.
2. Service Worker prüfen: In Chrome DevTools → `Application` → `Service Workers`, dann „Offline“ aktivieren und UI weiter nutzen.
3. Installation: In Chrome „Installieren“ bzw. auf iOS über „Zum Home-Bildschirm“.

> Cache-Strategie anpassen? Passe die Konstante `CACHE_VERSION` in `public/sw.js` oder die Fall-Back-Routen (`PRECACHE_URLS`) an. Nach Änderungen Service Worker in DevTools aktualisieren.

### Auth-Flow testen

1. Öffne [http://localhost:3000/login](http://localhost:3000/login) und fordere einen Magic-Link für eine E-Mail-Adresse an.  
2. Supabase sendet einen Link an diese Adresse und leitet nach dem Klick auf [http://localhost:3000/auth/callback](http://localhost:3000/auth/callback) weiter. Der Callback prüft die Rolle und bringt dich je nach Profil nach `/app/student` oder `/app/admin`.  
3. Im geschützten Bereich wird das Profil aus der Tabelle `profiles` geladen (`email`, `role`). Ergänze die Tabelle in Supabase entsprechend.  
4. Über den Logout-Button wird eine POST-Anfrage an `/logout` gesendet, die die Session invalidiert und zurück auf `/login` führt.  
5. Für Admin-Routen (`/app/admin`) wird anhand des Profils geprüft, ob `role === 'admin'`. Ohne passende Rolle erfolgt ein Redirect zum Schüler-Dashboard.

### Hinweise

- Stelle in Supabase unter **Authentication → URL Configuration** sicher, dass sowohl deine lokale Callback-URL (`http://localhost:3000/auth/callback`) als auch die Produktions-URL (`https://DEINE-DOMAIN/auth/callback`) als Redirect hinterlegt sind.  
- SMTP bzw. Mail-Dienst konfigurieren, damit Supabase E-Mails verschicken kann.  
- Die bisherigen Passwort-Registrierungsrouten bleiben optional erhalten. Du kannst sie entfernen, wenn ausschließlich Magic-Link-Auth zum Einsatz kommen soll.
- Ergänzende Detailbeschreibung zum Buchungssystem findest du in `docs/booking-system.md`.

## App-Struktur

### Student-App

- **Bottom Navigation** (mobil) / **Top Tabs** (Desktop): `Home`, `Lektionen`, `Vorschläge`, `Profil`.  
- **Floating Action Button**: `Buchen` startet den Anfrage-Flow (`/app/student/request`, Platzhalter).  
- **Home** (`/app/student`): aktives Paket via `v_student_current_package`, Fortschritt, Credit-Kachel, direkter Paketkauf (10er/20er) mit Geocoding + Wegkosten-Snapshot.  
- **Lektionen** (`/app/student/lessons`): zukünftige Lessons mit Aktionen zum Verschieben (Request) oder Stornieren (>24 h). Pending-Verschiebungen werden angezeigt.  
- **Vorschläge** (`/app/student/suggestions`): Admin→Student Vorschläge (`booking_requests`), Aktionen *Annehmen*, *Ablehnen*, *Gegenvorschlag*.  
- **Profil** (`/app/student/profile`): Stammdaten, Zahlungen (read-only), Logout.

### Admin-Portal

- **Navigation**: `Overview`, `Schüler`, `Anfragen`, `Kalender`, `Zahlungen`, plus Link zu `Einstellungen`.  
- **Overview** (`/app/admin`): Kennzahlen (Anfragen pending, Lessons < 24h, Zahlungen pending) & Quick Actions.  
- **Schüler** (`/app/admin/students`): Liste mit Credits (via `v_student_current_package`), nächster Termin.  
- **Anfragen** (`/app/admin/requests`): Inbox der student→admin Requests inkl. Verlauf, markiert nach Typ (Neue Buchung / Verschiebung).  
- **Kalender** (`/app/admin/calendar`): Liste zukünftiger Lessons inkl. Direktaktionen zum Verschieben oder Stornieren.  
- **Zahlungen** (`/app/admin/payments`): Übersicht `payments` (pending/paid/refunded).  
- **Vorschlag senden** (`/app/admin/requests/new`): Admin → Student Vorschläge.

## Supabase-Setup (Tabellen & Views)

1. **profiles** – muss `role` (`'student'` / `'admin'`), optionale `full_name`, `address` enthalten.  
2. **student_packages** – Felder: `id`, `student_id`, `lessons_total`, `lessons_used`, `status` (`active`/`completed`), `created_at`.  
3. **lessons** – Felder: `id`, `student_id`, `student_package_id` (nullable), `starts_at`, `ends_at`, `status` (`booked`, …).  
4. **booking_requests** – Felder:  
   - `id`, `student_id`, `requester_id`, `direction` (`'student_to_admin'` / `'admin_to_student'`),  
   - `status` (`pending`, `accepted`, `declined`), `kind` (`booking`, `reschedule`), `lesson_id` (nullable), `proposed_starts_at`, `proposed_ends_at`, `message`, `counter_of` (nullable).  
5. **payments** – Felder: `id`, `student_id`, `amount`, `currency`, `status` (`pending`, `paid`, `refunded`), `method`, `receipt_url`, `created_at`.  
6. **lessons**: zusätzliche Felder `cancellation_reason`, `cancelled_at`, `cancelled_by` für Historie.  
7. **View `v_student_current_package`** – sollte je Schüler das aktive Paket + `lessons_left`, `lessons_used`, `lessons_total`, optional `next_lesson_at` zurückgeben. Beispiel:

```sql
create or replace view v_student_current_package as
select
  sp.student_id,
  sp.id as student_package_id,
  sp.lessons_total,
  sp.lessons_used,
  greatest(sp.lessons_total - coalesce(sp.lessons_used, 0), 0) as lessons_left,
  (
    select l.starts_at
    from lessons l
    where l.student_id = sp.student_id
      and l.status = 'booked'
      and l.starts_at > now()
    order by l.starts_at asc
    limit 1
  ) as next_lesson_at
from student_packages sp
where sp.status = 'active';
```

> **Schema-Hinweis**: Setze für bestehende `booking_requests` den Default `kind = 'booking'` (und `lesson_id = null`). In `lessons` sollten die Felder `cancellation_reason`, `cancelled_at`, `cancelled_by` nullable sein, damit Stornierungen sauber geloggt werden können.

### RLS-Empfehlungen (Auszug)

- `student_packages`, `lessons`, `booking_requests`, `payments`: `student_id = auth.uid()` für Rolle *student*.  
- Admin-Rolle (`role = 'admin'`) erhält `select`/`insert` via Supabase Policies (z. B. `exists`-Check gegen Profile).  
- Server-Actions nutzen `supabaseService` (Service-Roll-Key) für privilegierte Operationen (Lesson-Erstellung, Credits abbuchen).

### Beispiel-Flow

1. Student klickt `Buchen` → `booking_requests`-Eintrag (`kind = 'booking'`, `direction = student_to_admin`).  
2. Admin sendet Vorschlag → `booking_requests` (`kind = 'booking'`, `direction = admin_to_student`).  
3. Student nimmt Vorschlag an → neue Lesson + Credit −1.  
4. Gegenvorschlag erzeugt neuen `student_to_admin`-Request; Original wird `declined`.  
5. Student verschiebt Lesson → `booking_requests` (`kind = 'reschedule'`, `lesson_id` gesetzt); nach Admin-Annahme wird die Lesson aktualisiert.  
6. Student storniert Lesson (>24 h) → `lessons.status = cancelled`, Grund in `cancellation_reason` + Credits werden zurückgebucht. Admin kann jederzeit stornieren oder Lessons direkt verschieben.  
7. Paketbuchung: Adresse prüfen → Distanz über Google Maps ermitteln → `activate_package_with_travel` (Snapshot von Distanz/Wegkosten).  
