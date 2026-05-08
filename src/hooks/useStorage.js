import {
  getDefaultReminders,
  markReminderDone,
  toDateKey,
} from '../utils/reminders.js'

// ─── Migration ────────────────────────────────────────────────────────────────
// Plants saved before the reminders refactor have a top-level lastWatered ISO
// string and no reminders object. Convert lastWatered → reminders.watering
// .lastCompleted (as YYYY-MM-DD), build defaults for the other five types,
// drop the legacy field. Idempotent — already-migrated plants pass through.

function migratePlant(plant) {
  if (plant.reminders) return { plant, changed: false }

  const reminders = getDefaultReminders(plant)
  if (plant.lastWatered) {
    reminders.watering.lastCompleted = toDateKey(plant.lastWatered)
  }

  const { lastWatered, ...rest } = plant
  return { plant: { ...rest, reminders }, changed: true }
}

function migratePlants(plants) {
  let changed = false
  const migrated = plants.map(p => {
    const result = migratePlant(p)
    if (result.changed) changed = true
    return result.plant
  })
  return { plants: migrated, changed }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStorage() {

  function saveUser(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
  }

  function getUser() {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  }

  function hasUser() {
    return !!localStorage.getItem('user');
  }

  function clearUser() {
    localStorage.removeItem('user');
  }

  function savePlants(plants) {
    localStorage.setItem('plants', JSON.stringify(plants));
  }

  function getPlants() {
    const data = localStorage.getItem('plants');
    if (!data) return [];
    const raw = JSON.parse(data);
    const { plants, changed } = migratePlants(raw);
    if (changed) savePlants(plants);
    return plants;
  }

  function addPlant(plant) {
    const plants = getPlants();
    const reminders = getDefaultReminders(plant);
    reminders.watering.lastCompleted = toDateKey(new Date());
    const newPlant = {
      ...plant,
      id: 'plant_' + Date.now(),
      addedDate: new Date().toISOString(),
      reminders,
      diagnoses: [],
    };
    plants.push(newPlant);
    savePlants(plants);
    return newPlant;
  }

  function updatePlant(plantId, updates) {
    const plants = getPlants();
    const index = plants.findIndex(p => p.id === plantId);
    if (index !== -1) {
      plants[index] = { ...plants[index], ...updates };
      savePlants(plants);
    }
  }

  function deletePlant(plantId) {
    const plants = getPlants();
    savePlants(plants.filter(p => p.id !== plantId));
  }

  function markReminder(plantId, type) {
    const plants = getPlants();
    const index = plants.findIndex(p => p.id === plantId);
    if (index === -1) return;
    plants[index] = markReminderDone(plants[index], type);
    savePlants(plants);
  }

  function waterPlant(plantId) {
    markReminder(plantId, 'watering');
  }

  function saveDiagnosis(plantId, diagnosis) {
    const plants = getPlants();
    const index = plants.findIndex(p => p.id === plantId);
    if (index !== -1) {
      if (!plants[index].diagnoses) plants[index].diagnoses = [];
      plants[index].diagnoses.unshift({
        ...diagnosis,
        date: new Date().toISOString(),
      });
      savePlants(plants);
    }
  }

  // ─── Locations ───────────────────────────────────────────────────────────────

  function getLocations() {
    try { return JSON.parse(localStorage.getItem('locations') || '[]') }
    catch { return [] }
  }

  function saveLocations(locs) {
    localStorage.setItem('locations', JSON.stringify(locs))
  }

  function addLocation(data) {
    const locs = getLocations()
    const loc = { ...data, id: 'loc_' + Date.now(), createdAt: new Date().toISOString() }
    locs.push(loc)
    saveLocations(locs)
    return loc
  }

  function updateLocation(id, updates) {
    const locs = getLocations()
    const idx  = locs.findIndex(l => l.id === id)
    if (idx !== -1) { locs[idx] = { ...locs[idx], ...updates }; saveLocations(locs) }
  }

  function deleteLocation(id) {
    saveLocations(getLocations().filter(l => l.id !== id))
  }

  return {
    saveUser, getUser, hasUser, clearUser,
    savePlants, getPlants, addPlant,
    updatePlant, deletePlant, waterPlant,
    markReminder, saveDiagnosis,
    getLocations, addLocation, updateLocation, deleteLocation,
  };
}
