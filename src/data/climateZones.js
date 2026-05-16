// Plantshub climate-zone catalogue. Codes match the values stored on
// plants in plantshubCatalogue.js (`plant.climate`) and on the user's
// profile (`user.zone`).

export const climateZones = [
  { code: 'Z1',  name: 'Cold Alpine',          maxTemp: 20, emoji: '🏔️', cities: ['Spiti', 'Ladakh', 'Lahaul'] },
  { code: 'Z2',  name: 'Cold Hills',           maxTemp: 25, emoji: '⛰️', cities: ['Darjeeling', 'Manali', 'Shimla'] },
  { code: 'Z3',  name: 'Subtropical Hills',    maxTemp: 28, emoji: '🌄', cities: ['Kalimpong', 'Ooty', 'Kodaikanal'] },
  { code: 'Z4',  name: 'Subtropical Highland', maxTemp: 33, emoji: '🏞️', cities: ['Pune Hills', 'Mahabaleshwar'] },
  { code: 'Z5',  name: 'Subtropical Monsoon',  maxTemp: 38, emoji: '🌧️', cities: ['Guwahati', 'Agartala'] },
  { code: 'Z7',  name: 'Humid Subtropical',    maxTemp: 42, emoji: '☀️', cities: ['Delhi', 'Lucknow', 'Patna'] },
  { code: 'Z11', name: 'Tropical Coastal',     maxTemp: 38, emoji: '🌊', cities: ['Mumbai', 'Goa', 'Mangalore'] },
  { code: 'Z12', name: 'Tropical Wet-Dry',     maxTemp: 40, emoji: '🌴', cities: ['Pune', 'Bangalore'] },
  { code: 'Z16', name: 'Hot Semi-Arid',        maxTemp: 48, emoji: '🔆', cities: ['Delhi NCR', 'Jaipur'] },
  { code: 'Z17', name: 'Hot Arid',             maxTemp: 50, emoji: '🏜️', cities: ['Jaisalmer', 'Jodhpur'] },
]

export function getZone(code) {
  return climateZones.find(z => z.code === code) || null
}
