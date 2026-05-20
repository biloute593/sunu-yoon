/**
 * Geographie senegalaise : regions -> communes/villes
 * Permet d'elargir une recherche regionale a toutes les localites de la region.
 * Exemple : chercher "Dakar" trouve aussi les trajets depuis Malika, Pikine, etc.
 */

export const SENEGAL_REGIONS: Record<string, string[]> = {
  dakar: [
    'Dakar', 'Plateau', 'Medina', 'Grand Dakar', 'Biscuiterie', 'HLM',
    'Hann', 'Hann Bel Air', 'Ngor', 'Ouakam', 'Yoff', 'Mamelles',
    'Fann', 'Point E', 'Amitie', 'Liberte',
    'Pikine', 'Thiaroye', 'Djida Thiaroye', 'Keur Massar', 'Malika',
    'Yeumbeul', 'Diamaguene', 'Mbao', 'Tivaouane Peul',
    'Guediawaye', 'Golf Sud', 'Wakhinane', 'Sam Notaire',
    'Rufisque', 'Bargny', 'Diamniadio', 'Sebikhotane', 'Sangalkam',
    'Yene', 'Toubab Dialaw',
    'Parcelles Assainies', 'Camberene',
  ],

  thies: [
    'Thies', 'Thies Nord', 'Thies Est', 'Thies Ouest',
    'Mbour', 'Joal', 'Fadiouth', 'Joal-Fadiouth', 'Nguekokh',
    'Sindia', 'Malicounda', 'Saly', 'Saly Portudal',
    'Tivaouane', 'Mekhe', 'Pout', 'Khombole',
    'Kayar', 'Popenguine', 'Ndiaganiao',
  ],

  diourbel: [
    'Diourbel',
    'Mbacke', 'Touba', 'Ndame', 'Ndindy',
    'Bambey', 'Dinguiraye', 'Ngoye',
  ],

  'saint-louis': [
    'Saint-Louis', 'Sor', 'Ile Nord',
    'Dagana', 'Richard Toll', 'Rosso', 'Ndioum',
    'Podor', 'Cas Cas', 'Gamadji Sare',
  ],

  louga: [
    'Louga',
    'Kebemer', 'Dahra',
    'Linguere',
  ],

  fatick: [
    'Fatick',
    'Foundiougne', 'Sokone', 'Karang',
    'Gossas',
  ],

  kaolack: [
    'Kaolack', 'Kasnack', 'Medina Baye',
    'Guinguineo',
    'Nioro', 'Nioro du Rip',
  ],

  kaffrine: [
    'Kaffrine',
    'Birkelane', 'Malem Hodar', 'Koungheul',
  ],

  tambacounda: [
    'Tambacounda',
    'Bakel', 'Goudiry', 'Koumpentoum',
  ],

  kedougou: [
    'Kedougou',
    'Saraya', 'Salemata',
  ],

  kolda: [
    'Kolda',
    'Medina Yoro Foulah', 'Velingara',
  ],

  sedhiou: [
    'Sedhiou',
    'Bounkiling', 'Goudomp',
  ],

  ziguinchor: [
    'Ziguinchor', 'Bignona', 'Oussouye', 'Cap Skirring',
  ],

  matam: [
    'Matam', 'Kanel', 'Ranerou',
  ],
};

/**
 * Pour un terme de recherche donne, retourne tous les alias de recherche.
 * Si le terme correspond a une region -> retourne toutes les localites de cette region.
 * Sinon -> retourne le terme lui-meme (recherche directe sur la ville).
 */
export function expandSearchTerm(term: string): string[] {
  const normalized = term.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-\s]+/g, ' ').trim();

  for (const [regionKey, cities] of Object.entries(SENEGAL_REGIONS)) {
    const regionNorm = regionKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized === regionNorm) {
      return cities;
    }
    const firstCity = cities[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized === firstCity && normalized === regionNorm.split('-')[0]) {
      return cities;
    }
  }

  for (const [, cities] of Object.entries(SENEGAL_REGIONS)) {
    const firstCityNorm = cities[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized === firstCityNorm) {
      return cities;
    }
  }

  return [term.trim()];
}

/**
 * Construit un filtre Prisma OR pour chercher dans plusieurs villes a la fois.
 */
export function buildCityFilter(term: string, field: 'originCity' | 'destinationCity') {
  const cities = expandSearchTerm(term);
  if (cities.length === 1) {
    return { [field]: { contains: cities[0], mode: 'insensitive' as const } };
  }
  return {
    OR: cities.map(city => ({
      [field]: { contains: city, mode: 'insensitive' as const }
    }))
  };
}
