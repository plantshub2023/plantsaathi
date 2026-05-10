// ─── Condition-based fertilizer ──────────────────────────────────────────────
// Pure helpers (no I/O) for the treatment-mode fertilizer flow used when a
// plant's health score drops below 50. The fetch itself lives in CareTips.jsx
// (matches the existing fetchCareTips pattern in that file).

const VALID_TYPES = ['synthetic', 'liquid-organic', 'solid-organic', 'home-organic']
const VALID_ROLES = ['treatment', 'recovery']

const STR_FIELDS = [
  ['name',      60],
  ['dose',      80],
  ['frequency', 60],
  ['season',    60],
  ['method',    60],
  ['tip',      200],
  ['treats',   200],
]

// ─── Prompt ──────────────────────────────────────────────────────────────────

export function buildConditionPrompt({ plant, health, user, currentMonth }) {
  const f = health.factors
  // Diagnoses are unshifted (newest at index 0) — see useStorage.saveDiagnosis
  const latestDiagnosis = (plant.diagnoses && plant.diagnoses[0]) || null

  return `You are a plant doctor. This plant is unhealthy and needs treatment.

Plant: ${plant.name}${plant.category ? `\nCategory: ${plant.category}` : ''}
Health Score: ${health.score}/100
Zone: ${user?.zone ?? 'Z16'} - ${user?.zoneName ?? 'Subtropical Plains'}
City: ${user?.city ?? 'India'}
Month: ${currentMonth}

Health factors:
- Watering score: ${f.watering.earned}/${f.watering.max}
- Diagnosis score: ${f.diagnosis.earned}/${f.diagnosis.max}
- Tasks score: ${f.tasks.earned}/${f.tasks.max}
- Last care score: ${f.lastCare.earned}/${f.lastCare.max}

${latestDiagnosis
  ? `Latest diagnosis: ${JSON.stringify(latestDiagnosis)}`
  : 'No diagnosis available — assess from health factors only'}

Based on the health factors above, identify what is most likely wrong with this plant and suggest treatment fertilizers.

Low watering score → likely drought stress, root issues
Low diagnosis score → known disease or pest damage
Low tasks score → general neglect, nutrient deficiency
Low last care score → immediate intervention needed

Use ONLY fertilizers from this list with EXACT doses:

SYNTHETIC / GRANULAR:
- NPK 19:19:19 | 5g per litre water | soil drench
- NPK 20:20:20 | 5g per litre water | soil drench
- NPK 10:26:26 | 5g per litre water | soil drench
- NPK 12:61:00 (MKP) | 2g per litre water | soil drench or foliar
- Urea | 2g per litre water | soil drench
- DAP | 3g per litre water | soil drench
- MOP (Muriate of Potash) | 2g per litre water | soil drench
- Calcium nitrate | 2g per litre water | soil drench
- Epsom salt | 2g per litre water | soil drench or foliar
- Potassium humate | 2ml per litre water | soil drench
- Iron chelate | 1g per litre water | foliar spray

LIQUID ORGANIC:
- Seaweed extract | 2ml per litre water | soil drench or foliar
- Fish emulsion | 5ml per litre water | soil drench

ORGANIC SOLID / TOP DRESS:
- Vermicompost | 1 handful per pot | top dress monthly
- Cow dung compost | 1 handful per pot | top dress monthly
- Neem cake | 1 tsp per pot | top dress or soil drench
- Bone meal | 1 tsp per pot | top dress
- Rock phosphate | 1 tsp per pot | top dress
- Mustard cake (sarson ki khali) | soak 100g in 1 litre for 48hrs then dilute 1:5 | soil drench
- Groundnut cake | soak 100g in 1 litre for 48hrs then dilute 1:5 | soil drench

HOME / KITCHEN ORGANIC:
- Egg shell powder | 1 tsp per pot | top dress (calcium)
- Egg shell liquid | soak 10 shells in 1 litre for 48hrs | soil drench
- Milk diluted | 100ml per litre water | soil drench
- Banana peel liquid | soak 2 peels in 1 litre for 48hrs | soil drench
- Rice wash water | use directly | soil drench
- Onion peel liquid | soak peels 24hrs | soil drench
- Used tea leaves | 1 tsp per pot | top dress
- Coffee grounds | 1 tsp per pot | top dress
- Vegetable wash water | use directly | soil drench
- Compost tea | 200ml per litre water | soil drench

Rules:
- Suggest 2-4 treatment fertilizers based on what this plant needs
- Focus on RECOVERY not regular feeding
- First fertilizer must address the most critical deficiency
- Include at least 1 home/kitchen organic if possible
- Never guess doses — copy doses verbatim from the list above
- role must be exactly "treatment" or "recovery"
- type must be one of: "synthetic" | "liquid-organic" | "solid-organic" | "home-organic"
- Return ONLY a JSON array — no markdown fences, no preamble:
[
  {
    "name": "...",
    "type": "synthetic|liquid-organic|solid-organic|home-organic",
    "role": "treatment|recovery",
    "dose": "exact dose string from list",
    "frequency": "e.g. Every 7 days while recovering",
    "season": "e.g. Year round during recovery",
    "method": "soil drench / foliar spray / top dress",
    "tip": "≤120 chars, one practical Indian-conditions tip",
    "treats": "what deficiency or problem this fixes"
  }
]
Order by urgency — most critical treatment first.`
}

// ─── Validator ───────────────────────────────────────────────────────────────
// Defensive shape check + length cap. Returns null on no valid items.

export function validateConditionFertilizer(parsed) {
  if (!Array.isArray(parsed)) return null

  const cleaned = parsed
    .map(item => {
      if (!item || typeof item !== 'object')   return null
      if (!VALID_TYPES.includes(item.type))    return null
      if (!VALID_ROLES.includes(item.role))    return null

      const out = { type: item.type, role: item.role }
      for (const [field, max] of STR_FIELDS) {
        const v = item[field]
        if (typeof v !== 'string' || !v.trim()) return null
        out[field] = v.trim().slice(0, max)
      }
      return out
    })
    .filter(Boolean)
    .slice(0, 6)

  if (cleaned.length === 0) return null

  // Treatment items first, recovery items second; preserve AI's ordering within
  cleaned.sort((a, b) => {
    if (a.role === b.role) return 0
    return a.role === 'treatment' ? -1 : 1
  })
  return cleaned
}
