// Reminder system for PlantSaathi.
// Source of truth for all per-plant care schedules.
// Dates are stored as 'YYYY-MM-DD' strings in local timezone.

export const REMINDER_TYPES = {
  watering:    { label: 'Watering',    icon: '💧',  defaultFrequencyDays: 3   },
  misting:     { label: 'Misting',     icon: '🌫️', defaultFrequencyDays: 2   },
  fertilizing: { label: 'Fertilizing', icon: '🌱',  defaultFrequencyDays: 30  },
  rotating:    { label: 'Rotating',    icon: '🔄', defaultFrequencyDays: 14  },
  pruning:     { label: 'Pruning',     icon: '✂️',  defaultFrequencyDays: 60  },
  repotting:   { label: 'Repotting',   icon: '🪴', defaultFrequencyDays: 365 },
}

// Convert Date | ISO string | YYYY-MM-DD → 'YYYY-MM-DD' (local timezone).
// Returns null for falsy / unparseable input.
export function toDateKey(input) {
  if (!input) return null
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return null
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Whole-day delta between today and the given date key (local midnight).
// Null / invalid → Infinity so "never done" reads as fully overdue.
export function daysSince(dateKey) {
  if (!dateKey) return Infinity
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!m) return Infinity
  const then  = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((today - then) / (1000 * 60 * 60 * 24))
}

// Build the full reminders object for a plant. Watering frequency comes from
// plant.waterDays when present (set by AddPlant when picked from the catalog),
// otherwise the type default. All lastCompleted start null — caller decides
// whether to backfill (e.g. addPlant treats today as "watered today").
export function getDefaultReminders(plant) {
  const reminders = {}
  for (const [type, def] of Object.entries(REMINDER_TYPES)) {
    let frequencyDays = def.defaultFrequencyDays
    if (type === 'watering' && typeof plant?.waterDays === 'number') {
      frequencyDays = plant.waterDays
    }
    reminders[type] = {
      enabled:       true,
      frequencyDays,
      lastCompleted: null,
    }
  }
  return reminders
}

export function isReminderDue(reminder) {
  if (!reminder?.enabled) return false
  if (!reminder.lastCompleted) return true
  return daysSince(reminder.lastCompleted) >= reminder.frequencyDays
}

// Negative = overdue, 0 = due today, positive = days remaining.
// Disabled reminders return Infinity so they sort last and never show as due.
export function daysUntilDue(reminder) {
  if (!reminder?.enabled) return Infinity
  if (!reminder.lastCompleted) return 0
  return reminder.frequencyDays - daysSince(reminder.lastCompleted)
}

export function getDueReminders(plant) {
  if (!plant?.reminders) return []
  return Object.entries(plant.reminders)
    .filter(([, r]) => isReminderDue(r))
    .map(([type]) => type)
}

// Pure: returns a new plant with reminders[type].lastCompleted set to today.
// Caller persists via useStorage.updatePlant.
export function markReminderDone(plant, type) {
  if (!plant?.reminders?.[type]) return plant
  return {
    ...plant,
    reminders: {
      ...plant.reminders,
      [type]: {
        ...plant.reminders[type],
        lastCompleted: toDateKey(new Date()),
      },
    },
  }
}
