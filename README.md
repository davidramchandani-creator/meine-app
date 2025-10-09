## Registrierung mit Supabase

Die Anwendung bietet eine Registrierungsseite unter `/register`, über die sich Nutzer:innen mit E-Mail-Adresse und Passwort anmelden können. Nach der Registrierung verschickt Supabase automatisch eine Bestätigungs-E-Mail und leitet zur Login-Seite weiter.

### Voraussetzungen

Lege eine Supabase-Instanz an und trage die öffentlichen Verbindungsdaten in einer `.env.local` im Projektverzeichnis ein:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUPABASE_ANON_KEY"
```

Starte anschließend die Entwicklungsumgebung:

```bash
npm install
npm run dev
```

Öffne danach [http://localhost:3000/register](http://localhost:3000/register) in deinem Browser, um das Formular zu testen. Nach erfolgreicher Registrierung wirst du automatisch auf [http://localhost:3000/login](http://localhost:3000/login) geleitet, wo du dich mit dem bestätigten Konto anmelden kannst.

### Anmeldung

Verwende die Login-Seite unter `/login`, um dich mit einer bestätigten E-Mail-Adresse und dem zugehörigen Passwort einzuloggen. Nach einem erfolgreichen Login wirst du auf die Startseite der Anwendung weitergeleitet.

### Hinweis zur E-Mail-Bestätigung

Damit Supabase E-Mails versenden kann, müssen im Supabase-Projekt die entsprechenden SMTP-Einstellungen hinterlegt sein. Während der Entwicklung kannst du alternativ einen Dienst wie [Mailtrap](https://mailtrap.io/) verwenden.
