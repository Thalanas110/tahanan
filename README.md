# Tahanan

**Tahanan** is a private everyday-life app for couples. It helps two partners stay connected, organized, safe, and emotionally supported through daily check-ins, shared reminders, love notes, health notes, tasks, and emergency alerts.

The project is built as a mobile-first web app with PWA potential.

---

## Overview

Tahanan is designed to feel like a digital home for two people.

It is not a surveillance app.
It is not a tracking app.
It is not a control system.

It is a private shared space for:

* Daily emotional check-ins
* Safety updates
* Shared calendar events
* Love notes and encouragements
* Health notes
* Tasks and routines
* Emergency/SOS alerts

---

## Tech Stack

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* Supabase
* Supabase Auth
* Supabase PostgreSQL
* Supabase Realtime
* Supabase Row Level Security

---

## Features

### Authentication

* Sign up
* Log in
* Log out
* Persistent auth session
* Protected routes

### Couple Pairing

* Create a couple space
* Generate invite code
* Join using invite code
* Two-user couple membership model

### Dashboard

* Latest personal check-in
* Latest partner check-in
* Upcoming reminders
* Emergency alert banner
* Quick actions

### Daily Check-ins

Users can submit:

* Mood
* Energy level
* Health status
* Safety status
* Notes
* Private/public-to-partner setting

### Calendar

Users can manage:

* Classes
* Deadlines
* Monthsaries
* Church events
* Personal plans
* Shared reminders

### Love Notes

Users can create:

* Love notes
* Poems
* Prayers
* Encouragements
* Apologies
* Memories
* “Open when…” notes

### Health Notes

Health notes are private by default.

Users can optionally share notes with their partner.

### Tasks

Users can create and assign:

* School tasks
* Coding practice
* Health routines
* Chores
* Relationship goals
* Personal reminders

### Emergency/SOS Mode

Users can:

* Trigger an SOS event
* Add an emergency message
* Add a manual location note (or automatic if allowed, via gps)
* Let the partner acknowledge the alert
* Resolve the emergency event

No hidden tracking.
No secret location monitoring.
No background surveillance.

---

## Project Structure

```txt
src/
  components/
    ui/
    layout/
    checkins/
    calendar/
    notes/
    health/
    tasks/
    emergency/
  hooks/
  lib/
  pages/
  types/
migrations/
```

---

## Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never expose the Supabase service role key in frontend code.

---

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## Supabase Setup

All PostgreSQL code should be placed inside the `migrations/` folder.

The database uses these core tables:

```txt
profiles
couples
couple_members
daily_checkins
calendar_events
love_notes
health_notes
tasks
emergency_events
trusted_contacts
```

Row Level Security should be enabled on all tables.

Main access rule:

```txt
Users can only access data belonging to their own couple.
Private records are visible only to the creator.
Health notes are private unless explicitly shared.
```

---

## Security Principles

Tahanan follows these rules:

* Use Supabase RLS on every table
* Never expose service role keys
* Never rely only on frontend checks
* Keep health data private by default
* Keep emergency tools consent-based
* Do not implement hidden tracking
* Do not implement secret monitoring
* Test access using at least two accounts
* Confirm that third-party accounts cannot access another couple’s data

---

## CC License

The sound license is as follows:
military_alarm.wav by KIZILSUNGUR -- https://freesound.org/s/96973/  License: Creative Commons 0

---

## Product Philosophy

Tahanan should feel like a home.

It should help both partners feel:

* Loved
* Safe
* Respected
* Organized
* Connected

The app should strengthen trust, not replace it.
