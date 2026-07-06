# Dienstplaner

Persönlicher Schichtplaner für Zeitarbeit-Pflegedienste — Kalender, Stundenzählung
gegen ein Monatssoll und Arbeitszeitnachweis-PDFs mit Unterschriften-Pad.

**App:** https://dkorn85.github.io/dienstplaner/

## Funktionen

- **Kalender** (Monatsansicht): Dienste mit Von/Bis, Pause, Einsatzort und Kurznotiz.
  Nachtdienste über Mitternacht zählen zum Starttag.
- **Monatsbilanz:** Ist / Soll / fehlende Stunden. Standard-Soll in den Einstellungen,
  Ausnahmen pro Monat möglich.
- **Einsatzorte** als feste Tokens mit Farbe, Kürzel und Standard-Dienstzeiten
  (Ort wählen → Zeiten vorausgefüllt).
- **Arbeitszeitnachweis-PDF pro Kalenderwoche** (korrekte ISO-KW): eine Datei,
  eine Seite je Einrichtung, jede Seite mit eigener Wochensumme und eigenem
  Unterschriften-Paar. Unterschrift direkt auf dem Handy; die eigene Signatur
  wird in den Einstellungen gespeichert und vorbefüllt.

## Technik

- Statisches HTML/CSS/JS (keine Build-Tools), Bibliotheken via CDN-Pins:
  supabase-js, jsPDF + autoTable, signature_pad.
- Daten in Supabase (Projekt `gpchwlqeqejxvynewjns`, Tabellen `dp_*`,
  Row Level Security owner-only). Schema: `docs/schema.sql`.
- Hosting: GitHub Pages. Deployment = `git push` (Pages baut in ~1 min).

## Entwicklung

```bash
npm test        # Zeitlogik-Tests (node tests/time.test.mjs)
npm run serve   # lokal auf http://localhost:8000
```

## Ersteinrichtung

1. `#setup` an die URL hängen → einmalig registrieren → Bestätigungs-Mail antippen.
2. Anmelden — beim ersten Login werden Grundeinstellungen und die bekannten
   Einsatzorte automatisch angelegt.
3. In den Einstellungen die eigene Unterschrift aufnehmen.

Hinweis: Der Publishable Key in `js/config.js` ist öffentlich by design;
die Sicherheitsgrenze ist Row Level Security in der Datenbank.
