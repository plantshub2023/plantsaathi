// ─── Recommended Care Plan — AI utility ──────────────────────────────────────
// Uses the same fetch pattern as Diagnosis.jsx (no SDK, direct browser call).

export const FREQUENCY_RANGES = {
  watering:    { min: 1,  max: 14,  defaultDays: 3   },
  misting:     { min: 1,  max: 7,   defaultDays: 2   },
  fertilizing: { min: 7,  max: 90,  defaultDays: 30  },
  rotating:    { min: 7,  max: 30,  defaultDays: 14  },
  pruning:     { min: 30, max: 180, defaultDays: 90  },
  repotting:   { min: 90, max: 730, defaultDays: 365 },
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Prompt ──────────────────────────────────────────────────────────────────

export function buildPrompt({ plantName, category, zone, zoneName, city, currentMonth, catalogWaterDays }) {
  const wateringLock = typeof catalogWaterDays === 'number'
    ? `\nIMPORTANT: The watering frequency is fixed at ${catalogWaterDays} days — use this exact integer for reminders.watering.frequencyDays; do not override it.`
    : ''

  return `You are an expert Indian horticulturist giving personalised care advice.
Plant: ${plantName}
Category: ${category || 'general'}
Zone: ${zone || 'Z16'} — ${zoneName || 'Subtropical Plains'}
City: ${city || 'India'}
Current month: ${currentMonth}${wateringLock}

Return ONLY a JSON object — no markdown fences, no preamble, no explanation after the JSON.

Required schema:
{
  "reminders": {
    "watering":    {"enabled": true,  "frequencyDays": 3,   "reasoning": "1 sentence ≤120 chars"},
    "misting":     {"enabled": false, "frequencyDays": 2,   "reasoning": "1 sentence ≤120 chars"},
    "fertilizing": {"enabled": true,  "frequencyDays": 30,  "reasoning": "1 sentence ≤120 chars"},
    "rotating":    {"enabled": true,  "frequencyDays": 14,  "reasoning": "1 sentence ≤120 chars"},
    "pruning":     {"enabled": true,  "frequencyDays": 90,  "reasoning": "1 sentence ≤120 chars"},
    "repotting":   {"enabled": true,  "frequencyDays": 365, "reasoning": "1 sentence ≤120 chars"}
  },
  "setupInfo": {
    "soil":        "Well-draining sandy mix with compost",
    "sunlight":    "Bright indirect, 4–6 hours/day",
    "temperature": "18–28°C, avoid below 10°C",
    "humidity":    "Moderate, 40–60%",
    "fertilizer":  "Balanced NPK (10-10-10), once a month during growing season"
  }
}

Rules:
- Set enabled=false for types that don't apply (e.g. misting for cacti, rotating for outdoor trees, pruning for small succulents).
- frequencyDays must be an integer within: watering 1–14, misting 1–7, fertilizing 7–90, rotating 7–30, pruning 30–180, repotting 90–730.
- Each reasoning: 1 sentence, ≤120 chars, mention the zone/season/plant trait that drives the value.
- Each setupInfo value: ≤80 chars, plain language, no jargon.
- fertilizer: 1 sentence max 100 chars — fertilizer type, NPK ratio if relevant, and frequency. Plain language, no jargon.`
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function validateFrequency(type, days) {
  const range = FREQUENCY_RANGES[type]
  if (!range) return days
  return Math.min(range.max, Math.max(range.min, Math.round(days)))
}

// ─── Main API call ────────────────────────────────────────────────────────────

export async function generateCarePlan({ plantName, category, zone, zoneName, city, catalogWaterDays }) {
  const currentMonth = MONTHS[new Date().getMonth()]
  const prompt = buildPrompt({ plantName, category, zone, zoneName, city, currentMonth, catalogWaterDays })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                              'application/json',
      'x-api-key':                                 import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error?.message ?? `API error ${res.status}`)
  }

  const apiData = await res.json()
  const rawText = (apiData.content?.[0]?.text ?? '').trim()

  // Strip markdown fences if the model wrapped the JSON anyway
  const stripped = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed
  try {
    parsed = JSON.parse(stripped)
  } catch {
    // Last-resort: extract first {...} blob
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Could not parse AI response — please try again')
    try {
      parsed = JSON.parse(match[0])
    } catch {
      throw new Error('Could not parse AI response — please try again')
    }
  }

  // ── Validate reminders ────────────────────────────────────────────────────
  const TYPES = ['watering', 'misting', 'fertilizing', 'rotating', 'pruning', 'repotting']
  const rawReminders = parsed.reminders ?? {}
  const reminders = {}

  for (const type of TYPES) {
    const raw   = rawReminders[type] ?? {}
    const range = FREQUENCY_RANGES[type]

    let frequencyDays = parseInt(raw.frequencyDays ?? range.defaultDays, 10)
    if (isNaN(frequencyDays)) frequencyDays = range.defaultDays
    frequencyDays = Math.min(range.max, Math.max(range.min, frequencyDays))

    // Catalog lock overrides AI's watering suggestion
    if (type === 'watering' && typeof catalogWaterDays === 'number') {
      frequencyDays = catalogWaterDays
    }

    const enabled   = raw.enabled !== undefined ? Boolean(raw.enabled) : true
    const reasoning = typeof raw.reasoning === 'string' ? raw.reasoning.slice(0, 200) : ''

    reminders[type] = { enabled, frequencyDays, reasoning }
  }

  // ── Validate setupInfo ────────────────────────────────────────────────────
  const rawSetup = parsed.setupInfo ?? {}
  const setupInfo = {
    soil:        typeof rawSetup.soil        === 'string' ? rawSetup.soil.slice(0, 120)        : '',
    sunlight:    typeof rawSetup.sunlight    === 'string' ? rawSetup.sunlight.slice(0, 120)    : '',
    temperature: typeof rawSetup.temperature === 'string' ? rawSetup.temperature.slice(0, 120) : '',
    humidity:    typeof rawSetup.humidity    === 'string' ? rawSetup.humidity.slice(0, 120)    : '',
    fertilizer:  typeof rawSetup.fertilizer  === 'string' ? rawSetup.fertilizer.slice(0, 120)  : '',
  }

  return { reminders, setupInfo }
}
