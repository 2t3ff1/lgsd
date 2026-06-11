# Let's Get Shit Done (LGSD)

Eine Accountability-Plattform: Trag deine täglichen Aufgaben ein, lass sie von Workspace-Mitgliedern
bestätigen und sammle Punkte, Streaks und Belohnungen.

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- Supabase (Auth, PostgreSQL, Storage)
- Tailwind CSS, Plus Jakarta Sans
- canvas-confetti für die Konfetti-Animation

## Setup

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Supabase-Projekt einrichten

1. Erstelle ein neues Projekt auf [supabase.com](https://supabase.com).
2. Öffne den **SQL Editor** und führe das komplette Skript aus [`supabase/schema.sql`](supabase/schema.sql) aus.
   Es legt alle Tabellen, RLS-Policies, Funktionen, Trigger, den `pg_cron`-Job für die
   Mitternachts-Wartung sowie den Storage-Bucket `todo-proofs` an.
3. Aktiviere unter **Authentication > Providers** "Email" (Standard ist bereits aktiv).
4. Optional: Passe unter **Authentication > Email Templates** die Einladungs-/Bestätigungsmail an.

### 3. Umgebungsvariablen

Kopiere `.env.local.example` nach `.env.local` und trage deine Supabase-Projektdaten ein
(zu finden unter **Project Settings > API**):

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<dein-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft unter [http://localhost:3000](http://localhost:3000).

## Funktionen

- **Auth**: Registrierung & Login per E-Mail/Passwort
- **Workspaces**: private Gruppen, Einladung per E-Mail
- **Aufgaben**: einmalig oder wiederkehrend (täglich/wöchentlich/monatlich), mit Beweis-Upload
- **Bestätigungs-Flow**: Mitglieder bestätigen Aufgaben oder fordern einen Beweis an, auch
  nachträglich am nächsten Tag
- **Punkte & Streaks**: +10 für bestätigte Aufgaben, -5 für verpasste, +2 Streak-Bonus ab Tag 3
- **Monatsziele**: Zielpunktzahl + Belohnung, Konfetti bei Erreichen
- **Wochenziele**: freier Text, nur zur Übersicht
- **Rangliste**: pro Workspace nach Punkten sortiert

## Deployment auf Vercel

1. Repository zu Vercel hinzufügen.
2. Umgebungsvariablen `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` im
   Vercel-Projekt setzen.
3. Deployen — fertig.

## Hinweis zum Mitternachts-Job

Der `pg_cron`-Job `lgsd-daily-maintenance` läuft täglich um 00:00 Uhr (Server-Zeitzone der
Datenbank, standardmäßig UTC) und:

- vergibt -5 Punkte für offene/abgelehnte Aufgaben des Vortages und setzt deren Status auf
  `missed`
- setzt Streaks zurück, wenn ein Tag verpasst wurde
- erzeugt die nächste Instanz wiederkehrender Aufgaben

`pg_cron` muss in Supabase als Extension verfügbar sein (Standard bei den meisten Projekten,
unter **Database > Extensions** aktivierbar).
