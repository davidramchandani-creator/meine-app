## Magic-Link Auth mit Supabase

Die Anwendung nutzt Supabase Auth mit Magic-Link-Anmeldung. Nach dem Login landen Nutzer:innen im geschützten Bereich unter `/app/student`. Admins erhalten zusätzlich Zugriff auf `/app/admin`.

### Voraussetzungen

Lege eine `.env.local` im Projektverzeichnis an und trage deine Supabase-Konfiguration ein:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

> `SUPABASE_SERVICE_ROLE_KEY` wird nur serverseitig verwendet (z. B. für Admin-Aktionen). In Production sollte diese Variable ausschließlich als geschütztes Secret hinterlegt werden. `NEXT_PUBLIC_SITE_URL` setzt den Standard-Redirect für Logout und kann auf deine Produktions-URL zeigen.

Installiere anschließend die Abhängigkeiten und starte die App:

```bash
npm install
npm run dev
```

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
