// ─── Plant Health Score ──────────────────────────────────────────────────────
// Pure function — derives a 0-100 score from a plant's reminders + diagnoses.
//
// Notes on spec adaptations:
//
// - The codebase has no separate `tasks` table; every reminder lives on the
//   plant itself as `plant.reminders[type] = { enabled, frequencyDays,
//   lastCompleted }`. The `tasks` second arg is accepted for API compatibility
//   but is ignored — the "tasks" factor is computed from reminder state.
//
// - The diagnosis severity enum is `'high' | 'medium' | 'low'` in this app,
//   not the `'healthy' | 'minor' | 'severe'` the spec describes. Mapped:
//   high → severe (0), medium/low → minor (15). Plants with no diagnoses get
//   the spec's "neutral" 20.
//
// - Reminders only store `lastCompleted` (single date), not a history. So
//   "missed last 3 times" is approximated from current overdue cycles.

import { daysSince } from './reminders.js'

// ─── Per-factor scoring ──────────────────────────────────────────────────────

const MAX_WATERING  = 40
const MAX_DIAGNOSIS = 30
const MAX_TASKS     = 20
const MAX_LASTCARE  = 10

// 40 pts. Approximates "missed last N waterings" from how overdue the current
// cycle is.
function scoreWatering(plant) {
  const w = plant.reminders?.watering
  if (!w?.enabled) return 20  // No water reminder → neutral
  if (!w.lastCompleted) return 0  // Never watered

  const days = daysSince(w.lastCompleted)
  const freq = w.frequencyDays > 0 ? w.frequencyDays : 3

  if (days <= freq)     return 40
  if (days <= freq * 2) return 25
  return 10
}

// 30 pts. No "healthy" diagnosis is ever stored — diagnoses only get saved
// when a problem is detected. So "no diagnoses" still means neutral (20).
function scoreDiagnosis(plant) {
  const diagnoses = plant.diagnoses || []
  if (diagnoses.length === 0) return 20

  const latest = diagnoses[0]  // Diagnoses.jsx unshifts, so [0] is most recent
  const sev    = (latest?.severity || '').toLowerCase()

  if (sev === 'high')                    return 0
  if (sev === 'medium' || sev === 'low') return 15
  return 20
}

// 20 pts. Proxy for "% of last-30-days tasks completed" since no task history
// exists: ratio of (enabled reminders not currently overdue) / (enabled total).
function scoreTasks(plant) {
  const reminders = plant.reminders || {}
  const enabled   = Object.values(reminders).filter(r => r?.enabled)
  if (enabled.length === 0) return 10

  const onTime = enabled.filter(r => {
    if (!r.lastCompleted) return false
    return daysSince(r.lastCompleted) <= (r.frequencyDays || Infinity)
  }).length

  const ratio = onTime / enabled.length
  if (ratio >= 0.9) return 20
  if (ratio >= 0.7) return 15
  if (ratio >= 0.5) return 10
  return 5
}

// 10 pts. Days since the *most recent* `lastCompleted` across all reminders.
function scoreLastCare(plant) {
  const reminders = plant.reminders || {}
  const ages = Object.values(reminders)
    .map(r => r?.lastCompleted)
    .filter(Boolean)
    .map(d => daysSince(d))

  if (ages.length === 0) return 0

  const minDays = Math.min(...ages)
  if (minDays <= 3)  return 10
  if (minDays <= 7)  return 7
  if (minDays <= 14) return 4
  return 0
}

// ─── Status mapping ──────────────────────────────────────────────────────────

function statusFor(score) {
  if (score >= 80) return { status: 'thriving',   label: 'Thriving',   color: '#1D9E75', emoji: '🌿' }
  if (score >= 50) return { status: 'needs-care', label: 'Needs Care', color: '#F59E0B', emoji: '🌡️' }
  return                  { status: 'unhealthy',  label: 'Unhealthy',  color: '#EF4444', emoji: '🚨' }
}

// ─── Weakest-factor banner messages ──────────────────────────────────────────
// The banner above the condition-based fertilizer schedule names whichever
// factor is dragging the plant's score down hardest.

const FACTOR_RECOVERY_MSG = {
  watering:  'Severe water stress detected',
  diagnosis: 'Plant disease detected',
  tasks:     'Plant neglected',
  lastCare:  'No recent care',
}

// Returns the factor with the lowest earned/max ratio, with a banner string.
// Ties are broken by the order in FACTOR_RECOVERY_MSG (watering first).
export function getWeakestFactor(health) {
  if (!health?.factors) return null
  let weakest = null
  for (const key of Object.keys(FACTOR_RECOVERY_MSG)) {
    const f = health.factors[key]
    if (!f) continue
    const ratio = f.max > 0 ? f.earned / f.max : 1
    if (!weakest || ratio < weakest.ratio) {
      weakest = { key, ratio, label: FACTOR_RECOVERY_MSG[key] }
    }
  }
  return weakest
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function calculateHealthScore(plant /*, tasks */) {
  if (!plant) {
    return {
      score:  0,
      status: 'unhealthy',
      label:  'Unhealthy',
      color:  '#EF4444',
      emoji:  '🚨',
      factors: {
        watering:  { earned: 0, max: MAX_WATERING  },
        diagnosis: { earned: 0, max: MAX_DIAGNOSIS },
        tasks:     { earned: 0, max: MAX_TASKS     },
        lastCare:  { earned: 0, max: MAX_LASTCARE  },
      },
    }
  }

  const factors = {
    watering:  { earned: scoreWatering(plant),  max: MAX_WATERING  },
    diagnosis: { earned: scoreDiagnosis(plant), max: MAX_DIAGNOSIS },
    tasks:     { earned: scoreTasks(plant),     max: MAX_TASKS     },
    lastCare:  { earned: scoreLastCare(plant),  max: MAX_LASTCARE  },
  }
  const score = factors.watering.earned + factors.diagnosis.earned
              + factors.tasks.earned    + factors.lastCare.earned

  return { score, ...statusFor(score), factors }
}
