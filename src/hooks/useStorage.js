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
    return data ? JSON.parse(data) : [];
  }

  function addPlant(plant) {
    const plants = getPlants();
    const newPlant = {
      ...plant,
      id: 'plant_' + Date.now(),
      addedDate: new Date().toISOString(),
      lastWatered: new Date().toISOString(),
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

  function waterPlant(plantId) {
    updatePlant(plantId, { lastWatered: new Date().toISOString() });
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

  return {
    saveUser, getUser, hasUser, clearUser,
    savePlants, getPlants, addPlant,
    updatePlant, deletePlant, waterPlant,
    saveDiagnosis,
  };
}
