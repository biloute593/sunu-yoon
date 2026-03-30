import { Ride as ApiRide } from '../services/rideService';
import { Ride } from '../types';

// Convertir les données de l'API vers le format frontend
export const mapApiRideToRide = (apiRide: ApiRide): Ride => {
  // Le nom peut venir de firstName/lastName ou directement de name
  const driverName = apiRide.driver.name || 
    `${apiRide.driver.firstName || ''} ${apiRide.driver.lastName || ''}`.trim() || 
    'Conducteur';
  
  return {
    id: apiRide.id,
    driver: {
      id: apiRide.driver.id || 'unknown',
      name: driverName,
      avatarUrl: apiRide.driver.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=10b981&color=fff`,
      rating: apiRide.driver.rating || 4.5,
      reviewCount: apiRide.driver.reviewCount || 0,
      isVerified: apiRide.driver.isVerified || false
    },
    origin: apiRide.origin,
    destination: apiRide.destination,
    departureTime: apiRide.departureTime,
    price: apiRide.price,
    currency: apiRide.currency || 'XOF',
    seatsAvailable: apiRide.seatsAvailable,
    totalSeats: apiRide.totalSeats,
    carModel: apiRide.carModel || 'Véhicule',
    description: apiRide.description,
    features: apiRide.features || [],
    duration: apiRide.estimatedDuration || '~3h',
    status: apiRide.status || 'active',
    createdAt: apiRide.createdAt || new Date().toISOString()
  };
};
