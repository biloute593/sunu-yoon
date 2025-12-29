const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface CachedResult {
  data: any;
  timestamp: number;
}

const searchCache = new Map<string, CachedResult>();
const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes

const getCacheKey = (origin: string, destination: string, date: string): string => {
  return `${origin}|${destination}|${date}`;
};

const getCachedResult = (key: string): any | null => {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }
  searchCache.delete(key);
  return null;
};

export interface RideDriver {
  id: string;
  firstName: string;
  lastName?: string;
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
  private getToken(): string | null {
    return localStorage.getItem('sunu_yoon_token');
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Rechercher des trajets
  async searchRides(params: RideSearchParams): Promise<Ride[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.origin) queryParams.append('origin', params.origin);
      if (params.destination) queryParams.append('destination', params.destination);
      if (params.date) queryParams.append('date', params.date);
      if (params.seats) queryParams.append('seats', params.seats.toString());

      const response = await fetch(`${API_URL}/rides/search?${queryParams.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error('Search rides failed:', response.status);
        // Si l'API échoue, on retourne un tableau vide plutôt que des données locales
        // pour forcer l'utilisation du cloud comme demandé.
        return [];
      }

      const data = await response.json();
      return data.data?.rides || [];
    } catch (error) {
      console.error('Search rides error:', error);
      return [];
    }
  }

  // Récupérer un trajet par ID
  async getRide(id: string): Promise<Ride | null> {
    try {
      const response = await fetch(`${API_URL}/rides/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error('Get ride error:', error);
      return null;
    }
  }

  // Créer un trajet
  async createRide(data: CreateRideData): Promise<Ride> {
    try {
      // Mapping pour correspondre à l'API backend
      const apiData = {
        originCity: data.origin,
        originAddress: data.origin, // Fallback
        destinationCity: data.destination,
        destinationAddress: data.destination, // Fallback
        departureTime: data.departureTime,
        pricePerSeat: data.price,
        totalSeats: data.seatsAvailable,
        description: data.description,
        features: data.features,
        estimatedDuration: 180, // Valeur par défaut (3h) si non calculé
        distance: 0 // Valeur par défaut
      };

      const response = await fetch(`${API_URL}/rides`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création du trajet');
      }

      const result = await response.json();
      return result.data?.ride || result;
    } catch (error) {
      console.error('API create failed:', error);
      throw error;
    }
  }

  // Récupérer mes trajets publiés
  async getMyRides(): Promise<Ride[]> {
    let apiRides: Ride[] = [];
    try {
      const response = await fetch(`${API_URL}/rides/my-rides`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        apiRides = data.rides || data || [];
      }
    } catch (error) {
      console.error('Get my rides error:', error);
    }

    // Combine with local rides
    const localRides = getLocalRides();
    // Filter out duplicates if any (though IDs should differ)
    const allRides = [...localRides, ...apiRides];
    
    // Sort by date desc
    return allRides.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Annuler un trajet
  async cancelRide(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/rides/${id}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      return response.ok;
    } catch (error) {
      console.error('Cancel ride error:', error);
      return false;
    }
  }

  // Réserver un trajet
  async bookRide(rideId: string, seats: number = 1): Promise<{ bookingId: string }> {
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ rideId, seats })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la réservation');
    }

    return await response.json();
  }

  // Données de démonstration si l'API n'est pas disponible
  private getMockRides(params: RideSearchParams): Ride[] {
    // 1. Récupérer les trajets locaux (créés par l'utilisateur)
    const localRides = getLocalRides();
    
    // 2. Filtrer les trajets locaux selon les critères de recherche
    const filteredLocalRides = localRides.filter(ride => {
      // Filtre par origine (si spécifié)
      if (params.origin && !ride.origin.toLowerCase().includes(params.origin.toLowerCase())) {
        return false;
      }
      
      // Filtre par destination (si spécifié)
      if (params.destination && !ride.destination.toLowerCase().includes(params.destination.toLowerCase())) {
        return false;
      }
      
      // Filtre par date (si spécifié)
      if (params.date) {
        const searchDate = new Date(params.date).toDateString();
        const rideDate = new Date(ride.departureTime).toDateString();
        if (searchDate !== rideDate) {
          return false;
        }
      }
      
      // Filtre par places (si spécifié)
      if (params.seats && ride.seatsAvailable < params.seats) {
        return false;
      }
      
      return true;
    });

    // 3. Générer les trajets de démonstration (adaptatifs)
    // NOTE: Suppression des trajets fictifs pour la production
    const mockRides: Ride[] = [];

    // Combiner les résultats : trajets locaux uniquement
    return filteredLocalRides;
  }
}

export const rideService = new RideService();
export default rideService;
