// Plant-family chips for Home page browse. Counts are approximate (derived
// from the v2 catalogue snapshot) and used only for display alongside the
// chip label; filtering uses the slug → name lookup in `slugToFamilyName`.

export const plantFamilies = [
  { slug: 'cactus',         name: 'Cactus',         emoji: '🌵', count: 41 },
  { slug: 'echeveria',      name: 'Echeveria',      emoji: '🌹', count: 31 },
  { slug: 'azalea',         name: 'Azalea',         emoji: '🌸', count: 29 },
  { slug: 'haworthia',      name: 'Haworthia',      emoji: '🌵', count: 23 },
  { slug: 'agave',          name: 'Agave',          emoji: '🌿', count: 23 },
  { slug: 'philodendron',   name: 'Philodendron',   emoji: '🌿', count: 22 },
  { slug: 'peperomia',      name: 'Peperomia',      emoji: '🍃', count: 21 },
  { slug: 'african-violet', name: 'African Violet', emoji: '💜', count: 16 },
  { slug: 'aglaonema',      name: 'Aglaonema',      emoji: '🌿', count: 15 },
  { slug: 'calathea',       name: 'Calathea',       emoji: '🌿', count: 14 },
  { slug: 'palm',           name: 'Palm',           emoji: '🌴', count: 14 },
  { slug: 'anthurium',      name: 'Anthurium',      emoji: '❤️', count: 14 },
  { slug: 'sansevieria',    name: 'Snake Plant',    emoji: '🌿', count: 13 },
  { slug: 'ficus',          name: 'Ficus',          emoji: '🌳', count: 12 },
  { slug: 'rose',           name: 'Rose',           emoji: '🌹', count: 12 },
  { slug: 'hoya',           name: 'Hoya',           emoji: '💐', count: 11 },
  { slug: 'aloe',           name: 'Aloe Vera',      emoji: '🌵', count: 10 },
  { slug: 'monstera',       name: 'Monstera',       emoji: '🌿', count: 5  },
  { slug: 'pothos',         name: 'Pothos',         emoji: '🌿', count: 5  },
  { slug: 'orchid',         name: 'Orchid',         emoji: '🌸', count: 5  },
]

// Catalogue plants store `family` as a lowercase string with spaces
// (e.g. "african violet"); chip slugs use hyphens. This converts a slug
// to the data form so the Catalogue filter can match plants.
export function familySlugToDataName(slug) {
  return slug.replace(/-/g, ' ')
}

export function getFamily(slug) {
  return plantFamilies.find(f => f.slug === slug) || null
}
