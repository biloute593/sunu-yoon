import { ApiClient } from './apiClient';

export interface RideDriver {
  id: string;
  firstName: string;
  lastName?: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
}

export interface Ride {
  id: string;
  driver: RideDriver;
  origin: string;
  destination: string;
  departureTime: string;
  price: number;
  currency: string;
  seatsAvailable: number;
  totalSeats: number;
  carModel?: string;
  description?: string;
  features: string[];
  estimatedDuration?: string;
  status: string;
  createdAt: string;
}

export interface RideSearchParams {
  origin?: string;
  destination?: string;
  date?: string;
  seats?: number;
}

export interface CreateRideData {
  origin: string;
  destination: string;
  departureTime: string;
  price: number;
  seatsAvailable: number;
  carModel?: string;
  description?: string;
  features?: string[];
  driver?: RideDriver; // Add optional driver
}

// Helper for local storage of rides (fallback/demo)
const getLocalRides = (): Ride[] => {
  try {
    return JSON.parse(localStorage.getItem('sunu_yoon_local_rides') || '[]');
  } catch {
    return [];
  }
};

const saveLocalRide = (ride: Ride) => {
  const rides = getLocalRides();
  rides.unshift(ride);
  localStorage.setItem('sunu_yoon_local_rides', JSON.stringify(rides));
};

class RideService {
  // Rechercher des trajets
  async searchRides(params: RideSearchParams): Promise<Ride[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.origin) queryParams.append('origin', params.origin);
      if (params.destination) queryParams.append('destination', params.destination);
      if (params.date) queryParams.append('date', params.date);
      if (params.seats) queryParams.append('seats', params.seats.toString());

      const response = await ApiClient.get<{ data: { rides: Ride[] } }>(`/rides/search?${queryParams.toString()}`);

      if (!response.success) {
        console.error('Search rides failed:', response.error);
        // Fallback au localStorage en cas d'erreur
        return getLocalRides();
      }

      // @ts-ignore
      const rides = response.data?.rides || [];
      console.log(`${rides.length} trajet(s) trouvé(s) depuis l'API`);
      return rides;
    } catch (error) {
      console.error('Search rides error:', error);
      // Fallback au localStorage en cas d'erreur réseau
      return getLocalRides();
    }
  }

  // Récupérer un trajet par ID
  async getRide(id: string): Promise<Ride | null> {
    try {
      const response = await ApiClient.get<{ data: { ride: Ride } }>(`/rides/${id}`);

      if (!response.success || !response.data) {
        // Fallback au localStorage
        const localRides = getLocalRides();
        return localRides.find(r => r.id === id) || null;
      }

      // @ts-ignore
      return response.data.ride;
    } catch (error) {
      console.error('Get ride error:', error);
      // Fallback au localStorage en cas d'erreur
      const localRides = getLocalRides();
      return localRides.find(r => r.id === id) || null;
    }
  }

  // Créer un trajet
  async createRide(data: CreateRideData): Promise<Ride> {
    try {
      // Mapping pour correspondre à l'API backend
      const apiData = {
        originCity: data.origin,
        originAddress: data.origin,
        destinationCity: data.destination,
        destinationAddress: data.destination,
        departureTime: data.departureTime,
        pricePerSeat: data.price,
        totalSeats: data.seatsAvailable,
        availableSeats: data.seatsAvailable,
        description: data.description || '',
        features: data.features || [],
        estimatedDuration: 180,
        distance: 0,
        // Pour les utilisateurs non connectés
        ...(data.driver ? {
          driverName: data.driver.name,
          driverPhone: data.driver.phone
        } : {})
      };

      console.log('Envoi des données à l\'API:', apiData);

      const response = await ApiClient.post<{ data: { ride: Ride } }>('/rides', apiData);

      if (!response.success) {
        console.error('Erreur API:', response.error);
        throw new Error(response.error?.message || 'Erreur lors de la création du trajet');
      }

      console.log('✅ Trajet créé avec succès via API:', response.data);

      // @ts-ignore
      const ride = response.data?.ride;
      if (ride) {
        saveLocalRide(ride as Ride); // Backup local
      }
      return ride as Ride;
    } catch (error) {
      console.error('Erreur création trajet:', error);
      throw error;
    }
  }

  // Récupérer mes trajets publiés
  async getMyRides(): Promise<Ride[]> {
    try {
      const response = await ApiClient.get<{ data: { rides: Ride[] } }>('/rides/my/published');

      if (response.success && response.data) {
        // @ts-ignore
        return response.data.rides || [];
      }
      
      // Fallback au localStorage
      return getLocalRides();
    } catch (error) {
      console.error('Get my rides error:', error);
      // Fallback au localStorage en cas d'erreur
      return getLocalRides();
    }
  }

  // Annuler un trajet
  async cancelRide(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.post<any>(`/rides/${id}/cancel`);
      return Boolean(response.success);
    } catch (error) {
      console.error('Cancel ride error:', error);
      return false;
    }
  }

  // Réserver un trajet
  async bookRide(rideId: string, seats: number = 1): Promise<{ bookingId: string }> {
    const response = await ApiClient.post<{ bookingId: string }>('/bookings', { rideId, seats });

    if (!response.success) {
      throw new Error(response.error?.message || 'Erreur lors de la réservation');
    }

    return response.data as { bookingId: string };
  }
}

export const rideService = new RideService();
export default rideService;
