export const PLANTS = [
  { id: 'monstera', name: 'Monstera', emoji: '🌿', waterDays: 5, category: 'tropical' },
  { id: 'pothos', name: 'Pothos', emoji: '🍃', waterDays: 4, category: 'tropical' },
  { id: 'rose', name: 'Rose', emoji: '🌹', waterDays: 2, category: 'flowering' },
  { id: 'tulsi', name: 'Tulsi', emoji: '🌱', waterDays: 1, category: 'herbs' },
  { id: 'aloe-vera', name: 'Aloe Vera', emoji: '🌵', waterDays: 7, category: 'succulent' },
  { id: 'hibiscus', name: 'Hibiscus', emoji: '🌺', waterDays: 2, category: 'flowering' },
  { id: 'jasmine', name: 'Jasmine', emoji: '🌸', waterDays: 2, category: 'flowering' },
  { id: 'adenium', name: 'Adenium', emoji: '🌸', waterDays: 7, category: 'succulent' },
  { id: 'cactus', name: 'Cactus', emoji: '🌵', waterDays: 14, category: 'succulent' },
  { id: 'succulent', name: 'Succulent', emoji: '🪴', waterDays: 10, category: 'succulent' },
  { id: 'curry-leaf', name: 'Curry Leaf', emoji: '🌿', waterDays: 2, category: 'herbs' },
  { id: 'snake-plant', name: 'Snake Plant', emoji: '🌿', waterDays: 7, category: 'indoor' },
  { id: 'bougainvillea', name: 'Bougainvillea', emoji: '🌺', waterDays: 3, category: 'flowering' },
  { id: 'mango', name: 'Mango', emoji: '🥭', waterDays: 3, category: 'fruit' },
  { id: 'peace-lily', name: 'Peace Lily', emoji: '🌷', waterDays: 3, category: 'indoor' },
  { id: 'neem', name: 'Neem', emoji: '🌳', waterDays: 3, category: 'trees' },
  { id: 'moringa', name: 'Moringa', emoji: '🌳', waterDays: 3, category: 'trees' },
  { id: 'banana', name: 'Banana', emoji: '🍌', waterDays: 2, category: 'fruit' },
  { id: 'coconut', name: 'Coconut', emoji: '🥥', waterDays: 3, category: 'trees' },
  { id: 'marigold', name: 'Marigold', emoji: '🌼', waterDays: 2, category: 'flowering' },
];

export const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'tropical', name: 'Tropical' },
  { id: 'flowering', name: 'Flowering' },
  { id: 'succulent', name: 'Succulent' },
  { id: 'herbs', name: 'Herbs' },
  { id: 'indoor', name: 'Indoor' },
  { id: 'fruit', name: 'Fruit' },
  { id: 'trees', name: 'Trees' },
];

export function getPlantById(id) {
  return PLANTS.find(p => p.id === id) || null;
}

export function getPlantsByCategory(category) {
  if (category === 'all') return PLANTS;
  return PLANTS.filter(p => p.category === category);
}
