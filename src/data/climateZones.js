// Plantshub climate-zone catalogue. Codes match the values stored on
// plants in plantshubCatalogue.js (`plant.climate`) and on the user's
// profile (`user.zone`). 18 zones total — Z0 through Z18 (Z15 is not
// in the active mapping).
//
// Array order is data-integrity order (kept stable for legacy IDs).
// For top-down Cold → Subtropical → Tropical display, iterate via
// `getZonesInDisplayOrder()` instead of mapping `climateZones` directly.

export const climateZones = [
  // ─── Cold ────────────────────────────────────────────────────────────────
  { code: 'Z0',  name: 'Cold Arid Trans-Himalayan',          maxTemp: 30, emoji: '🏔️', description: 'Leh, Ladakh region' },
  { code: 'Z1',  name: 'Cold Alpine',                        maxTemp: 20, emoji: '❄️', description: 'High altitude — Spiti, Lahaul' },
  { code: 'Z2',  name: 'Cold Hills',                         maxTemp: 25, emoji: '⛰️', description: 'Hill stations — Darjeeling, Shimla' },

  // ─── Subtropical ─────────────────────────────────────────────────────────
  { code: 'Z3',  name: 'Subtropical Hills',                  maxTemp: 28, emoji: '🌄', description: 'Lower hills — Kalimpong, Ooty' },
  { code: 'Z4',  name: 'Subtropical Highland',               maxTemp: 33, emoji: '🏞️', description: 'Highland areas' },
  { code: 'Z6',  name: 'Subtropical Monsoon Highland',       maxTemp: 34, emoji: '☁️', description: 'Highland monsoon' },
  { code: 'Z5',  name: 'Subtropical Monsoon',                maxTemp: 38, emoji: '🌧️', description: 'Northeast India' },
  { code: 'Z7',  name: 'Subtropical Humid',                  maxTemp: 42, emoji: '☀️', description: 'Delhi, Lucknow, Patna' },
  { code: 'Z8',  name: 'Subtropical Semi-Arid',              maxTemp: 44, emoji: '🌤️', description: 'Semi-dry interior' },
  { code: 'Z16', name: 'Subtropical Hot Semi-Arid Continental', maxTemp: 48, emoji: '🔆', description: 'Delhi NCR, Jaipur' },
  { code: 'Z17', name: 'Subtropical Hot Arid',               maxTemp: 50, emoji: '🏜️', description: 'Jaisalmer, Jodhpur' },

  // ─── Tropical ────────────────────────────────────────────────────────────
  { code: 'Z9',  name: 'Cool Tropical Highland',             maxTemp: 33, emoji: '🌳', description: 'Tropical highlands' },
  { code: 'Z10', name: 'Tropical Mid-Elevation Monsoon',     maxTemp: 38, emoji: '🌿', description: 'Mid-elevation tropics' },
  { code: 'Z11', name: 'Tropical Monsoon Coastal',           maxTemp: 38, emoji: '🌊', description: 'Mumbai, Goa, Mangalore' },
  { code: 'Z12', name: 'Tropical Wet-Dry Savanna',           maxTemp: 40, emoji: '🌴', description: 'Bangalore, Pune' },
  { code: 'Z13', name: 'Tropical Wet-Dry Savanna Hot Interior', maxTemp: 48, emoji: '🔥', description: 'Hot interior plains' },
  { code: 'Z14', name: 'Tropical Wet-Dry Savanna Coastal',   maxTemp: 40, emoji: '🏖️', description: 'Chennai, coastal Tamil Nadu' },
  { code: 'Z18', name: 'Tropical Hot Semi-Arid',             maxTemp: 47, emoji: '☀️', description: 'Hot semi-arid tropics' },
]

export function getZone(code) {
  return climateZones.find(z => z.code === code) || null
}

// Explicit on-screen ordering for grid/list renders. Kept separate from
// the array order so legacy IDs (Z0–Z18) stay stable while the UI can
// freely re-order. Z15 is intentionally omitted (merged into Z18).
export const CLIMATE_ZONE_DISPLAY_ORDER = [
  // Cold
  'Z0', 'Z1', 'Z2',
  // Subtropical (temperate to hot)
  'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z16', 'Z17',
  // Tropical
  'Z9', 'Z10', 'Z11', 'Z12', 'Z13', 'Z14', 'Z18',
]

export function getZonesInDisplayOrder() {
  return CLIMATE_ZONE_DISPLAY_ORDER
    .map(code => climateZones.find(z => z.code === code))
    .filter(Boolean)
}
