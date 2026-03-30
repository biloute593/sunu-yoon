import { Ride as ApiRide } from '../services/rideService';
import { Ride } from '../types';

/**
 * Convertir les données de l'API vers le format frontend.
 * 
 * IMPORTANT: Cette fonction doit être ultra-défensive car les données
 * de l'API peuvent avoir des formes variées. En production (minifié),
 * un accès à une propriété undefined cause un crash "s is not a function".
 */
export const mapApiRideToRide = (apiRide: any): Ride => {
  // Guard: si l'objet est null/undefined, retourner un objet par défaut
  if (!apiRide || typeof apiRide !== 'object') {
    console.warn('mapApiRideToRide: données invalides reçues', apiRide);
    return createDefaultRide();
  }

  // Si c'est déjà un objet Ride frontend (a déjà driver.name en string, pas firstName)
  // Ne pas re-mapper
  if (apiRide.driver && typeof apiRide.driver.name === 'string' && apiRide.duration) {
    return apiRide as Ride;
  }

  // Driver peut être un objet ou null/undefined
  const driver = apiRide.driver || {};
  
  // Le nom peut venir de firstName/lastName ou directement de name
  const driverName = 
    (typeof driver.name === 'string' && driver.name) || 
    [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() || 
    'Conducteur';
  
  return {
    id: apiRide.id || `ride-${Date.now()}`,
    driver: {
      id: driver.id || 'unknown',
      name: driverName,
      avatarUrl: driver.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=10b981&color=fff`,
      rating: Number(driver.rating) || 4.5,
      reviewCount: Number(driver.reviewCount) || 0,
      isVerified: Boolean(driver.isVerified)
    },
    origin: apiRide.origin || apiRide.originCity || 'Inconnue',
    destination: apiRide.destination || apiRide.destinationCity || 'Inconnue',
    departureTime: apiRide.departureTime || new Date().toISOString(),
    price: Number(apiRide.price) || Number(apiRide.pricePerSeat) || 0,
    currency: apiRide.currency || 'XOF',
    seatsAvailable: Number(apiRide.seatsAvailable) || Number(apiRide.availableSeats) || 0,
    totalSeats: Number(apiRide.totalSeats) || 4,
    carModel: apiRide.carModel || 'Véhicule',
    description: apiRide.description || '',
    features: Array.isArray(apiRide.features) ? apiRide.features : [],
    duration: apiRide.duration || apiRide.estimatedDuration || '~3h',
    status: apiRide.status || 'active',
    createdAt: apiRide.createdAt || new Date().toISOString()
  };
};

/** Crée un objet Ride par défaut en cas de données totalement invalides */
function createDefaultRide(): Ride {
  return {
    id: `fallback-${Date.now()}`,
    driver: {
      id: 'unknown',
      name: 'Conducteur',
      avatarUrl: 'https://ui-avatars.com/api/?name=C&background=10b981&color=fff',
      rating: 4.5,
      reviewCount: 0,
      isVerified: false
    },
    origin: 'Inconnue',
    destination: 'Inconnue',
    departureTime: new Date().toISOString(),
    price: 0,
    currency: 'XOF',
    seatsAvailable: 0,
    totalSeats: 4,
    carModel: 'Véhicule',
    description: '',
    features: [],
    duration: '~3h',
    status: 'active',
    createdAt: new Date().toISOString()
  };
}
