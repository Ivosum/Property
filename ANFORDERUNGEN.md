# Property Network — Anforderungen & Umsetzung

Stand: 23.08.2026

---

## 1. Marke & Landing Page
- Marke **Property Network** im Fokus: All-in-One-Immobilienlösung auf einer Plattform
- Struktur: Hero → Was wir anbieten (Features) → Dienstleistungen (Wie es funktioniert) → Plattform-Zugänge (Mitte der Seite) → Finanzierungsrechner → CTA → Footer
- 4 gleichwertige Säulen: **Verkaufen, Kaufen, Finanzieren, Verwalten**
- Design: Bronze/Kupfer als Primary, Slate-Grau als Neutral, Gold-Akzente, Glassmorphism
- Typografie: Playfair Display (Headings), Inter (Body)
- Buttons kompakt, sichtbar, mit Gradient und starkem Kontrast
- Logo in Header, Footer und Sidebars
- Dezente Bilder (Schweizer Immobilien-Thematik), nicht überladen
- Test-Zugangsdaten sind **nicht** öffentlich auf der Hauptseite sichtbar
- SEO: deutsche Meta-Tags, Open Graph, Twitter Cards, Schema.org, semantisches HTML, Alt-Texte

## 2. Off-Market Plattform (`/auth`, `/off-market`)
- Rollen: Käufer, Verkäufer, Makler, Admin — Registrierung mit Rollenauswahl
- KYC-/Verifizierungsprozess inkl. Dokumenten-Upload
- Immobilien: Suche, Favoriten, eigene Objekte, Nachrichten, Dokumente
- **Dynamisches Formular "Immobilie hinzufügen"**: Felder richten sich nach der Immobilienart
  - Wohnung: Zimmer, Wohnfläche, Stockwerk, Balkon, Lift
  - Mehrfamilienhaus: Wohneinheiten, Mieteinnahmen, Lift
  - Bauland: Grundstücksfläche, nutzbare Baufläche, Zonentyp
  - Villa: Pool, Gartenfläche etc.
  - Gewerbe: Nutzfläche, Mieteinnahmen
- **CRM für Admin**:
  - Benutzerverwaltung: Benutzer als Admin erfassen
  - Gesamtübersicht über Käufer, Verkäufer und Makler
  - Registrierungen und hochgeladene Dokumente bearbeiten, Verifizierungen durchführen
  - Mitarbeiter anlegen mit eigenen Logins
  - Manuelle Kundenzuweisung: wer bearbeitet welchen Kunden
  - Feingranulare Berechtigungen: was darf welcher Mitarbeiter sehen
  - Aktivitäten/Audit-Log, Kundendetail-Panel mit Dokumenten, Objekten, Finanzierungen

## 3. Immobilienverwaltung (`/pm-auth`, `/property-management`)
- Eigener Login **und** Registrierung für Verwaltungen (Rollen: Administrator, Bewirtschafter, Mitarbeiter)
- PM-Benutzer werden immer zur Immobilienverwaltung geleitet (nicht Off-Market); nur der Super-Admin geht in den Off-Market-Bereich
- Module: Liegenschaften, Mieteinheiten, Mieter, Verträge, Finanzen/Finanzbuchhaltung, Mängel, Dokumente, Nebenkostenabrechnungen, Kommunikation, Online-Inserierung, Berichte, Einstellungen
- Automatisierte Erstellung von Mietverträgen, Wohnungsabnahmeprotokolle
- Vorbereitung von Online-Inseraten inkl. Ablehnungen mit automatischer Begründung
- Admin sieht alle Daten, Objekte, Aufgaben, Mitarbeitenden und Mieter
- Zugriff der Mitarbeitenden ist auf ihre zugewiesenen Liegenschaften eingeschränkt (RLS)

## 4. Mieterportal (`/tenant-auth`, `/tenant-portal`)
- Separate Anmeldeoption für Mieter (E-Mail/Passwort, Weiterleitung ins Portal)
- Mietvertrag einsehen, Zahlungsübersicht, Dokumente, Mängel melden

## 5. Finanzierung
- Eigenständiger **Finanzierungsrechner** auf der Hauptseite: Hypothekar-, Bauland- und Baufinanzierungsrechner (Schweizer Regeln)
- Nicht angemeldete Besucher sehen einen Registrierungs-CTA; registrierte Kunden können direkt eine Anfrage stellen
- Finanzierungsanfrage: vollständige Kundendatenerfassung + Dokumenten-Upload (PDF etc.) in geschützten Storage
- Status-Workflow: Entwurf → Eingereicht → In Bearbeitung → Genehmigt/Abgelehnt → Abgeschlossen
- **Admin-Dashboard Finanzierung**: alle Anfragen, Kundendetails, Dokumentenansicht/Download, Statuswechsel, Chat mit dem Kunden

## 6. Technik
- React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- Backend: Auth, Datenbank mit RLS, Storage, Edge Functions
- Rollen in separaten Tabellen (`user_roles`, `pm_user_roles`) mit Security-Definer-Funktionen
- Sicherheits-Scan durchgeführt und Findings behoben (PM-Daten nach Liegenschaft eingeschränkt, Audit-Log geschützt, Leaked-Password-Protection aktiviert)

## 7. Test-Zugänge (Passwort: `test1234`)
| Bereich | E-Mail |
|---|---|
| Off-Market Käufer | kaeufer@test.ch |
| Off-Market Verkäufer | verkaeufer@test.ch |
| Off-Market Makler | makler@test.ch |
| Super-Admin | admin@test.ch |
| PM Admin | pm-admin@test.ch |
| PM Manager | pm-manager@test.ch |
| PM Mitarbeiter | pm-employee@test.ch |
| Mieter | mieter@test.ch |
