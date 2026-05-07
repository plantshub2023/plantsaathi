# PlantSaathi

A mobile-first plant-care PWA for Indian gardeners. Single-user, fully client-side — no backend, no auth.

## Stack

- React 18 + Vite (PWA via `vite-plugin-pwa`)
- React Router v6 (BrowserRouter)
- Inline styles + a few CSS variables — no Tailwind, no CSS-in-JS lib
- `localStorage` is the only persistence layer
- Anthropic API for care tips & diagnosis (browser-direct via `anthropic-dangerous-direct-browser-access`)
- OpenWeatherMap for the Garden header weather widget
- Deployed on Netlify

## Data model

Two top-level keys in localStorage: `user` and `plants`.

### user

```
{ name, zone, zoneName, city, lat, lon, joinedDate (ISO) }
```

### plants — array of:

```
{
  id:         'plant_<timestamp>',
  name:       string,
  emoji:      string,
  notes:      string,
  photo:      base64 dataURL | null,
  addedDate:  ISO timestamp,
  waterDays:  number | undefined,    // copied from PLANTS catalog when picked from dropdown; seeds reminders.watering.frequencyDays
  category:   string | undefined,    // same — drives Garden card background
  diagnoses:  [{ problem, cause, fixes, severity, zone_note, date (ISO) }],
  reminders:  Reminders,             // see below
}
```

The legacy top-level `lastWatered` field has been migrated into `reminders.watering.lastCompleted`. Migration runs inside `getPlants()` — idempotent, persists when mutated.

## Reminders system

All logic in [src/utils/reminders.js](src/utils/reminders.js). Six types — only watering has UI today; the others are persisted and waiting for a future pass.

```
REMINDER_TYPES = {
  watering, misting, fertilizing, rotating, pruning, repotting
}
```

Each plant's `reminders[type]`:

```
{ enabled: boolean, frequencyDays: number, lastCompleted: 'YYYY-MM-DD' | null }
```

Helpers exported: `REMINDER_TYPES`, `toDateKey`, `daysSince`, `getDefaultReminders`, `isReminderDue`, `daysUntilDue`, `getDueReminders`, `markReminderDone`. All pure — components persist via `useStorage().updatePlant` or the convenience `markReminder(plantId, type)`.

## Conventions

- **Dates:** `YYYY-MM-DD` strings (local timezone) for `reminders.lastCompleted`. ISO timestamps for `addedDate` and `diagnoses[].date`. Never compare ISO timestamps to derive day equality — round-trip through `toDateKey` first.
- **Persistence:** every write goes through `useStorage()`. Components do not touch `localStorage` directly.
- **Brand:** primary green `#1D9E75`, fonts DM Sans (body) + DM Serif Display (display) via CSS vars `--font-body` / `--font-display`.
- **Migrations:** add new shape changes to `migratePlant` in `useStorage.js`. Keep idempotent — runs on every `getPlants()`.

## Key files

- [src/hooks/useStorage.js](src/hooks/useStorage.js) — single source of localStorage access; runs the plant migration
- [src/utils/reminders.js](src/utils/reminders.js) — REMINDER_TYPES + pure helpers
- [src/pages/Garden.jsx](src/pages/Garden.jsx) — home page, plant grid, weather widget, "needs water" stat
- [src/pages/CareTips.jsx](src/pages/CareTips.jsx) — plant detail page; watering UI lives here
- [src/pages/AddPlant.jsx](src/pages/AddPlant.jsx) — 3-step add flow; persists `waterDays` + `category` from catalog pick
- [src/pages/Profile.jsx](src/pages/Profile.jsx) — profile, stats, zone info, reset
- [src/pages/Diagnosis.jsx](src/pages/Diagnosis.jsx) — photo-based AI diagnosis flow
- [src/data/plants.js](src/data/plants.js) — preset plant catalog (`waterDays`, `category` per plant)
- [src/data/zones.js](src/data/zones.js) — Indian climate zone definitions

## Gotchas

- `getPlants()` is called inline in render, not via `useEffect`. After a write, components re-pull on next render — bump a `tick` state to force it (see `handleWater` in CareTips).
- `plant.waterDays` is the **seed** for `reminders.watering.frequencyDays`, not a live value. Read frequency from the reminder.
- Free-text plants (no catalog pick) have `waterDays === undefined` → fall back to the 3-day default in `getDefaultReminders`.
