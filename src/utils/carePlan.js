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
Plant: ${plantName}${category ? `\nCategory: ${category}` : ''}
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
    "soil":        "Acidic, well-draining",
    "sunlight":    "Bright indirect, 4–6 hours/day",
    "temperature": "18–28°C, avoid below 10°C",
    "humidity":    "Moderate, 40–60%",
    "fertilizer":  "Balanced NPK (10-10-10), once a month during growing season"
  },
  "locationRecommendation": {
    "bestCategories":   ["Balcony", "Outdoor / On Ground"],
    "reason":           "Needs 6+ hours direct sunlight daily to thrive",
    "warningIfIndoor":  "May struggle without sufficient light in Living Room or Bedroom"
  },
  "soilMix": [
    {"ingredient": "Cocopeat",          "percent": 40},
    {"ingredient": "Vermicompost",      "percent": 25},
    {"ingredient": "Loamy garden soil", "percent": 20},
    {"ingredient": "Perlite",           "percent": 15}
  ],
  "fertilizerSchedule": [
    {
      "name":      "NPK 19:19:19",
      "type":      "synthetic",
      "role":      "primary",
      "dose":      "5g per litre water",
      "frequency": "Every 15 days",
      "season":    "March-September",
      "method":    "soil drench",
      "tip":       "Skip during peak heat above 38°C — leaves can scorch."
    },
    {
      "name":      "Vermicompost",
      "type":      "solid-organic",
      "role":      "supplement",
      "dose":      "1 handful per pot",
      "frequency": "Monthly",
      "season":    "Year round",
      "method":    "top dress",
      "tip":       "Top-dress around the base, then water in lightly."
    }
  ]
}

Rules:
- Set enabled=false for types that don't apply (e.g. misting for cacti, rotating for outdoor trees, pruning for small succulents).
- frequencyDays must be an integer within: watering 1–14, misting 1–7, fertilizing 7–90, rotating 7–30, pruning 30–180, repotting 90–730.
- Each reasoning: 1 sentence, ≤120 chars, mention the zone/season/plant trait that drives the value.
- Each setupInfo value: ≤80 chars, plain language, no jargon.
- soil should be just the soil type (e.g. "Acidic, well-draining"), not the mix recipe — soilMix below handles the ingredients.
- fertilizer: 1 sentence max 100 chars — fertilizer type, NPK ratio if relevant, and frequency. Plain language, no jargon.
- bestCategories must be one or more of these exact strings only: Living Room, Bedroom, Balcony, Potted Outdoor, Outdoor / On Ground, Office
- reason: 1 sentence, max 100 chars, explaining why those locations suit this plant considering its light, humidity and temperature needs
- warningIfIndoor: 1 sentence, max 120 chars, what happens if placed in a poor-match location. Use empty string if the plant adapts well to most locations.
- Consider the plant's light requirements, humidity tolerance, temperature sensitivity, and the Indian climate zone provided.
- soilMix: a custom 4-to-7-ingredient soil recipe for THIS specific plant. Use ingredients ONLY from this exact list, and use the exact strings shown:
  Cocopeat, Leaf mould, Loamy garden soil, Potting soil, River sand, Coarse river sand, Vermiculite, Perlite, Vermicompost, Cow dung compost, Neem cake, Coco husk chips, Pumice, Charcoal, Sphagnum moss, Bark chips, Peat moss, Compost, Wood ash, Bone meal, Rock phosphate, Mustard cake, Groundnut cake, Rice husk, Rice husk ash, Brick pieces, Pea gravel, Azomite, Dolomite lime, Sulfur powder, Coir dust, Spent mushroom substrate
- Match the soilMix to the plant's real needs (these are guidance, not strict templates):
  - Succulents/cacti → Coarse river sand + Perlite + Pumice heavy
  - Ferns/moisture lovers → Cocopeat + Leaf mould + Sphagnum moss heavy
  - Acid-loving plants → Peat moss + Sulfur powder + Leaf mould
  - Heavy feeders → Vermicompost + Bone meal + Cow dung compost
  - Orchids/epiphytes → Bark chips + Coco husk chips + Charcoal + Sphagnum moss
  - Tropical houseplants → Cocopeat + Vermicompost + Loamy garden soil + Perlite
- Never use both River sand and Coarse river sand in the same mix.
- Drainage-only ingredients (Brick pieces, Pea gravel) max 10%.
- soilMix percentages must be integers and add up to exactly 100.
- Order soilMix items by percent descending. Length must be 4 to 7 items.
- fertilizerSchedule: a custom fertilizer plan for THIS specific plant. Only suggest what this plant actually needs — simple plants get 2 fertilizers, heavy feeders get up to 4, most plants get 2-3. Use ONLY fertilizers from the list below, with EXACT doses — never guess.
  Allowed fertilizers (name | dose | method):
  SYNTHETIC:
    NPK 19:19:19 | 5g per litre water | soil drench
    NPK 20:20:20 | 5g per litre water | soil drench
    NPK 10:26:26 | 5g per litre water | soil drench
    NPK 12:61:00 (MKP) | 2g per litre water | soil drench or foliar
    Urea | 2g per litre water | soil drench
    DAP | 3g per litre water | soil drench
    MOP (Muriate of Potash) | 2g per litre water | soil drench
    Calcium nitrate | 2g per litre water | soil drench
    Epsom salt | 2g per litre water | soil drench or foliar
    Potassium humate | 2ml per litre water | soil drench
  LIQUID ORGANIC:
    Seaweed extract | 2ml per litre water | soil drench or foliar
    Fish emulsion | 5ml per litre water | soil drench
  SOLID ORGANIC / TOP DRESS:
    Vermicompost | 1 handful per pot | top dress monthly
    Cow dung compost | 1 handful per pot | top dress monthly
    Neem cake | 1 tsp per pot | top dress or soil drench
    Bone meal | 1 tsp per pot | top dress
    Rock phosphate | 1 tsp per pot | top dress
    Mustard cake (sarson ki khali) | soak 100g in 1 litre for 48hrs then dilute 1:5 | soil drench
    Groundnut cake | soak 100g in 1 litre for 48hrs then dilute 1:5 | soil drench
  HOME / KITCHEN ORGANIC:
    Egg shell powder | 1 tsp per pot (crush and dry first) | top dress
    Egg shell liquid | soak 10 shells in 1 litre for 48hrs, use directly | soil drench
    Milk diluted | 100ml per litre water | soil drench
    Banana peel liquid | soak 2 peels in 1 litre for 48hrs, use directly | soil drench
    Rice wash water | use directly undiluted | soil drench
    Onion peel liquid | soak peels in 1 litre for 24hrs, use directly | soil drench
    Used tea leaves | 1 tsp per pot | top dress
    Coffee grounds | 1 tsp per pot | top dress (acid-loving plants only)
    Vegetable wash water | use directly undiluted | soil drench
    Compost tea | 200ml per litre water | soil drench
- Each fertilizer item: { name, type, role, dose, frequency, season, method, tip }.
  - type ∈ "synthetic" | "liquid-organic" | "solid-organic" | "home-organic"
  - role ∈ "primary" | "supplement" — exactly ONE primary at minimum, ordered first
  - dose: copy verbatim from the list above
  - frequency: e.g. "Every 15 days", "Monthly", "Every 3 months"
  - season: e.g. "March-September" or "Year round"
  - method: e.g. "soil drench", "foliar spray", "top dress"
  - tip: ≤120 chars, one practical Indian-conditions tip
- fertilizerSchedule length: 2 to 6 items. Order by role ("primary" first), then most important supplements.`
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

  const res = await fetch('https://plantsaathi.com/api/claude-proxy.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

  // ── Validate locationRecommendation ───────────────────────────────────────
  const VALID_LOCATION_CATEGORIES = [
    'Living Room', 'Bedroom', 'Balcony',
    'Potted Outdoor', 'Outdoor / On Ground', 'Office',
  ]
  const rawLoc = parsed.locationRecommendation ?? {}
  const bestCategories = Array.isArray(rawLoc.bestCategories)
    ? rawLoc.bestCategories.filter(c => typeof c === 'string' && VALID_LOCATION_CATEGORIES.includes(c))
    : []
  const locationRecommendation = {
    bestCategories,
    reason:          typeof rawLoc.reason          === 'string' ? rawLoc.reason.slice(0, 120)          : '',
    warningIfIndoor: typeof rawLoc.warningIfIndoor === 'string' ? rawLoc.warningIfIndoor.slice(0, 150) : '',
  }

  // ── Validate soilMix ──────────────────────────────────────────────────────
  // Keep only items that match a canonical ingredient (case-insensitive),
  // round percents to integers, sort desc, cap at 7. Returns null if empty.
  const SOIL_INGREDIENTS = [
    'Cocopeat', 'Leaf mould', 'Loamy garden soil', 'Potting soil',
    'River sand', 'Coarse river sand', 'Vermiculite', 'Perlite',
    'Vermicompost', 'Cow dung compost', 'Neem cake', 'Coco husk chips',
    'Pumice', 'Charcoal', 'Sphagnum moss', 'Bark chips', 'Peat moss',
    'Compost', 'Wood ash', 'Bone meal', 'Rock phosphate', 'Mustard cake',
    'Groundnut cake', 'Rice husk', 'Rice husk ash', 'Brick pieces',
    'Pea gravel', 'Azomite', 'Dolomite lime', 'Sulfur powder',
    'Coir dust', 'Spent mushroom substrate',
  ]
  const ingredientByLower = new Map(SOIL_INGREDIENTS.map(s => [s.toLowerCase(), s]))

  let soilMix = null
  if (Array.isArray(parsed.soilMix)) {
    const cleaned = parsed.soilMix
      .map(item => {
        if (!item || typeof item !== 'object') return null
        const name = typeof item.ingredient === 'string'
          ? ingredientByLower.get(item.ingredient.trim().toLowerCase())
          : null
        const pct = parseFloat(item.percent)
        if (!name || !isFinite(pct) || pct <= 0) return null
        return { ingredient: name, percent: Math.round(pct) }
      })
      .filter(Boolean)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 7)
    if (cleaned.length > 0) soilMix = cleaned
  }

  // ── Validate fertilizerSchedule ───────────────────────────────────────────
  // Defensive shape check: keep only items with all required string fields and
  // valid type/role enums. Truncate string fields to safe lengths. Cap at 6.
  // Returns null if no valid items remain.
  const FERT_TYPES = ['synthetic', 'liquid-organic', 'solid-organic', 'home-organic']
  const FERT_ROLES = ['primary', 'supplement']
  const FERT_STR_FIELDS = [
    ['name',      60],
    ['dose',      80],
    ['frequency', 60],
    ['season',    60],
    ['method',    60],
    ['tip',      200],
  ]

  let fertilizerSchedule = null
  if (Array.isArray(parsed.fertilizerSchedule)) {
    const cleaned = parsed.fertilizerSchedule
      .map(item => {
        if (!item || typeof item !== 'object')   return null
        if (!FERT_TYPES.includes(item.type))     return null
        if (!FERT_ROLES.includes(item.role))     return null
        const out = { type: item.type, role: item.role }
        for (const [field, max] of FERT_STR_FIELDS) {
          const v = item[field]
          if (typeof v !== 'string' || !v.trim()) return null
          out[field] = v.trim().slice(0, max)
        }
        return out
      })
      .filter(Boolean)
      .slice(0, 6)
    if (cleaned.length > 0) {
      // Stable sort: primary roles first, preserving the AI's original order
      // within each role bucket.
      cleaned.sort((a, b) => {
        if (a.role === b.role) return 0
        return a.role === 'primary' ? -1 : 1
      })
      fertilizerSchedule = cleaned
    }
  }

  return { reminders, setupInfo, locationRecommendation, soilMix, fertilizerSchedule }
}
