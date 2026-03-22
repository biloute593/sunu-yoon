// Liste des villes principales du Sénégal pour l'autocomplétion
export const SENEGAL_CITIES = [
  'Dakar', 'Thiès', 'Saint-Louis', 'Touba', 'Kaolack', 'Ziguinchor',
  'Rufisque', 'Mbour', 'Diourbel', 'Tambacounda', 'Kolda', 'Fatick',
  'Louga', 'Matam', 'Kédougou', 'Sédhiou', 'Pikine', 'Guédiawaye',
  'Saly', 'Somone', 'Joal-Fadiouth', 'Richard Toll', 'Podor', 'Vélingara',
  'Bignona', 'Oussouye', 'Cap Skirring', 'Kafountine', 'Palmarin'
];

// Coordonnées GPS des principales villes sénégalaises
export const CITY_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  'Dakar': { lat: 14.6928, lng: -17.4467 },
  'Thiès': { lat: 14.7886, lng: -16.9260 },
  'Saint-Louis': { lat: 16.0179, lng: -16.4896 },
  'Touba': { lat: 14.8500, lng: -15.8833 },
  'Kaolack': { lat: 14.1652, lng: -16.0726 },
  'Ziguinchor': { lat: 12.5681, lng: -16.2719 },
  'Rufisque': { lat: 14.7158, lng: -17.2736 },
  'Mbour': { lat: 14.4167, lng: -16.9667 },
  'Diourbel': { lat: 14.6500, lng: -16.2333 },
  'Tambacounda': { lat: 13.7689, lng: -13.6672 },
  'Kolda': { lat: 12.8944, lng: -14.9500 },
  'Fatick': { lat: 14.3333, lng: -16.4167 },
  'Louga': { lat: 15.6167, lng: -16.2167 },
  'Matam': { lat: 15.6500, lng: -13.2500 },
  'Kédougou': { lat: 12.5556, lng: -12.1744 },
  'Sédhiou': { lat: 12.7081, lng: -15.5567 },
  'Pikine': { lat: 14.7500, lng: -17.4000 },
  'Guédiawaye': { lat: 14.7667, lng: -17.3833 },
  'Saly': { lat: 14.4500, lng: -17.0167 },
  'Somone': { lat: 14.4833, lng: -17.0833 },
  'Joal-Fadiouth': { lat: 14.1667, lng: -16.8333 },
  'Richard Toll': { lat: 16.4622, lng: -15.7000 },
  'Podor': { lat: 16.6500, lng: -14.9667 },
  'Vélingara': { lat: 13.1500, lng: -14.1167 },
  'Bignona': { lat: 12.8000, lng: -16.2333 },
  'Oussouye': { lat: 12.4833, lng: -16.5500 },
  'Cap Skirring': { lat: 12.3833, lng: -16.7500 },
  'Kafountine': { lat: 12.9333, lng: -16.7500 },
  'Palmarin': { lat: 14.0833, lng: -16.7500 }
};

/**
 * Calcule la distance en km entre deux points GPS (formule Haversine)
 */
export function calculateDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Estime la durée de trajet en minutes entre deux villes sénégalaises.
 * Facteur route 1.3x la distance à vol d'oiseau, vitesse moyenne 55 km/h.
 */
export function estimateTravelDuration(originCity: string, destinationCity: string): {
  durationMinutes: number;
  distanceKm: number;
  durationText: string;
} {
  const originCoords = findCityCoords(originCity);
  const destCoords = findCityCoords(destinationCity);

  if (!originCoords || !destCoords) {
    // Fallback si villes inconnues
    return { durationMinutes: 180, distanceKm: 0, durationText: '~3h' };
  }

  // Distance à vol d'oiseau
  const straightDistance = calculateDistanceKm(
    originCoords.lat, originCoords.lng,
    destCoords.lat, destCoords.lng
  );

  // Facteur route : les routes sénégalaises ne sont pas en ligne droite
  const roadFactor = 1.3;
  const roadDistance = Math.round(straightDistance * roadFactor);

  // Vitesse moyenne réaliste au Sénégal (~55 km/h avec arrêts, état des routes)
  const avgSpeedKmh = 55;
  const durationMinutes = Math.round((roadDistance / avgSpeedKmh) * 60);

  // Formater la durée
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  let durationText = '';
  if (hours > 0 && mins > 0) {
    durationText = `${hours}h${mins.toString().padStart(2, '0')}`;
  } else if (hours > 0) {
    durationText = `${hours}h`;
  } else {
    durationText = `${mins}min`;
  }

  return { durationMinutes, distanceKm: roadDistance, durationText };
}

/**
 * Cherche les coordonnées d'une ville (recherche fuzzy)
 */
function findCityCoords(cityName: string): { lat: number; lng: number } | null {
  const normalized = cityName.toLowerCase().trim();
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (
      city.toLowerCase() === normalized ||
      normalized.includes(city.toLowerCase()) ||
      city.toLowerCase().includes(normalized)
    ) {
      return coords;
    }
  }
  return null;
}
