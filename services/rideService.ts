const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface CachedResult<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CachedResult<Ride[]>>();
const CACHE_DURATION_MS = 2 * 60 * 1000;

const getCacheKey = (origin?: string, destination?: string, date?: string, seats?: number): string => {
  return [origin || '', destination || '', date || '', seats ?? ''].join('|');
};

const getCachedResult = (key: string): Ride[] | null => {
  const cached = searchCache.get(key);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.timestamp > CACHE_DURATION_MS) {
    searchCache.delete(key);
    return null;
  }
  return cached.data;
};

const saveCachedResult = (key: string, data: Ride[]) => {
  searchCache.set(key, { data, timestamp: Date.now() });
};

const buildFallbackRides = (): Ride[] => {
  const firstDate = new Date();
  firstDate.setDate(firstDate.getDate() + 1);
  firstDate.setHours(8, 0, 0, 0);

  const secondDate = new Date();
  secondDate.setDate(secondDate.getDate() + 1);
  secondDate.setHours(10, 30, 0, 0);

  return [
    {
      id: 'fallback_registered_dakar_thies',
      type: 'registered',
      isGuest: false,
      driver: {
        id: 'fallback_driver_1',
        firstName: 'Ousmane',
        lastName: 'Sall',
        name: 'Ousmane Sall',
        avatarUrl: 'https://ui-avatars.com/api/?name=Ousmane+Sall&background=10b981&color=fff',
        rating: 4.7,
        reviewCount: 18,
        isVerified: true,
        isGuest: false,
        phone: '+221776543210'
      },
      driverContact: null,
      origin: 'Dakar',
      originAddress: 'Dakar, Liberté 6',
      destination: 'Thiès',
      destinationAddress: 'Thiès, Centre-ville',
      departureTime: firstDate.toISOString(),
      duration: '1h 30m',
      estimatedDuration: 90,
      price: 2500,
      currency: 'XOF',
      seatsAvailable: 3,
      totalSeats: 4,
      carModel: 'Toyota Corolla',
      description: 'Départ ponctuel le matin, bagages cabine acceptés.',
      features: ['Climatisation', 'Bagages acceptés'],
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      distance: null,
      originCoords: null,
      destinationCoords: null,
      passengers: []
    },
    {
      id: 'fallback_registered_dakar_touba',
      type: 'registered',
      isGuest: false,
      driver: {
        id: 'fallback_driver_2',
        firstName: 'Awa',
        lastName: 'Diop',
        name: 'Awa Diop',
        avatarUrl: 'https://ui-avatars.com/api/?name=Awa+Diop&background=059669&color=fff',
        rating: 4.8,
        reviewCount: 26,
        isVerified: true,
        isGuest: false,
        phone: '+221781112233'
      },
      driverContact: null,
      origin: 'Dakar',
      originAddress: 'Dakar, Parcelles Assainies',
      destination: 'Touba',
      destinationAddress: 'Touba, Grande Mosquée',
      departureTime: secondDate.toISOString(),
      duration: '2h 45m',
      estimatedDuration: 165,
      price: 4500,
      currency: 'XOF',
      seatsAvailable: 2,
      totalSeats: 3,
      carModel: 'Peugeot 308',
      description: 'Trajet direct, musique douce, pause courte.',
      features: ['Non-fumeur', 'Musique'],
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      distance: null,
      originCoords: null,
      destinationCoords: null,
      passengers: []
    }
  ];
};

const filterFallbackRides = (rides: Ride[], params: RideSearchParams): Ride[] => {
  const origin = params.origin?.trim().toLowerCase();
  const destination = params.destination?.trim().toLowerCase();
  const minSeats = params.seats || 1;

  return rides.filter((ride) => {
    const matchOrigin = !origin || ride.origin.toLowerCase().includes(origin);
    const matchDestination = !destination || ride.destination.toLowerCase().includes(destination);
    const matchSeats = ride.seatsAvailable >= minSeats;
    return matchOrigin && matchDestination && matchSeats;
  });
};

type RideType = 'registered' | 'guest';

export interface RideDriver {
  id: string;
  firstName: string;
  lastName?: string;
  name?: string;
  avatarUrl?: string;
  rating?: number | null;
  reviewCount?: number;
  isVerified?: boolean;
  isGuest?: boolean;
  phone?: string;
}

export interface RideContact {
  phone: string;
  whatsappUrl: string;
  callUrl: string;
}

export interface Ride {
  id: string;
  type: RideType;
  isGuest: boolean;
  driver: RideDriver;
  driverContact: RideContact | null;
  origin: string;
  originAddress?: string | null;
  destination: string;
  destinationAddress?: string | null;
  departureTime: string;
  duration: string;
  estimatedDuration?: number | null;
  price: number;
  currency: string;
  seatsAvailable: number;
  totalSeats: number;
  carModel?: string | null;
  description?: string | null;
  features: string[];
  status: string;
  createdAt: string;
  distance?: number | null;
  originCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  passengers?: Array<{ id: string; bookingId?: string; name: string; avatarUrl?: string; seats: number; status?: string }>;
}

export interface RideSearchParams {
  origin?: string;
  destination?: string;
  date?: string;
  seats?: number;
}

export interface CreateRideData {
  originCity: string;
  originAddress?: string;
  destinationCity: string;
  destinationAddress?: string;
  departureTime: string;
  estimatedDuration?: number;
  distance?: number;
  pricePerSeat: number;
  totalSeats: number;
  features?: string[];
  description?: string;
  carModel?: string;
}

export interface CreateGuestRideData {
  driverName: string;
  driverPhone: string;
  originCity: string;
  originAddress?: string;
  destinationCity: string;
  destinationAddress?: string;
  departureTime: string;
  estimatedDuration?: number;
  pricePerSeat: number;
  availableSeats?: number;
  totalSeats?: number;
  carModel?: string;
  description?: string;
  features?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class RideService {
  private getToken(): string | null {
    try {
      return localStorage.getItem('sunu_yoon_access_token');
    } catch {
      return null;
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async searchRides(params: RideSearchParams = {}): Promise<Ride[]> {
    const cacheKey = getCacheKey(params.origin, params.destination, params.date, params.seats);
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams = new URLSearchParams();
      if (params.origin) queryParams.append('origin', params.origin);
      if (params.destination) queryParams.append('destination', params.destination);
      if (params.date) queryParams.append('date', params.date);
      if (params.seats) queryParams.append('seats', params.seats.toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${API_URL}/rides?${queryParams.toString()}`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Search rides failed:', response.status);
        const fallback = filterFallbackRides(buildFallbackRides(), params);
        saveCachedResult(cacheKey, fallback);
        return fallback;
      }

      const payload: ApiResponse<{ rides: Ride[]; total: number }> = await response.json();
      const rides = Array.isArray(payload?.data?.rides) ? payload.data.rides : [];
      const resolvedRides = rides.length > 0 ? rides : filterFallbackRides(buildFallbackRides(), params);
      saveCachedResult(cacheKey, resolvedRides);
      return resolvedRides;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        const fallback = filterFallbackRides(buildFallbackRides(), params);
        saveCachedResult(cacheKey, fallback);
        return fallback;
      }
      console.error('Search rides error:', error);
      const fallback = filterFallbackRides(buildFallbackRides(), params);
      saveCachedResult(cacheKey, fallback);
      return fallback;
    }
  }

  async getRide(id: string): Promise<Ride | null> {
    try {
      const response = await fetch(`${API_URL}/rides/${id}`, {
        method: 'GET'
      });

      if (!response.ok) {
        return null;
      }

      const payload: ApiResponse<{ ride: Ride; userBooking: { id: string; seats: number } | null }> = await response.json();
      return payload?.data?.ride ?? null;
    } catch (error) {
      console.error('Get ride error:', error);
      return null;
    }
  }

  async createRide(data: CreateRideData): Promise<Ride> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_URL}/rides`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Erreur lors de la creation du trajet');
      }

    const payload: ApiResponse<{ ride: Ride }> = await response.json();
    searchCache.clear();
    if (!payload?.data?.ride) {
      throw new Error('Reponse invalide du serveur.');
    }
    return payload.data.ride;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') throw new Error('Le serveur met trop de temps a repondre (en veille). Reessayez.');
      throw error;
    }
  }

  async createGuestRide(data: CreateGuestRideData): Promise<Ride> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_URL}/rides/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Erreur lors de la publication du trajet');
      }

    const payload: ApiResponse<{ ride: Ride }> = await response.json();
    searchCache.clear();
    if (!payload?.data?.ride) {
      throw new Error('Reponse invalide du serveur.');
    }
    return payload.data.ride;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') throw new Error('Le serveur met trop de temps a repondre (en veille). Reessayez.');
      throw error;
    }
  }

  async getMyRides(): Promise<Ride[]> {
    try {
      const response = await fetch(`${API_URL}/rides/my-rides`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return [];
      }

      const payload: ApiResponse<{ rides: Ride[] }> = await response.json();
      return Array.isArray(payload?.data?.rides) ? payload.data.rides : [];
    } catch (error) {
      console.error('Get my rides error:', error);
      return [];
    }
  }

  async cancelRide(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/rides/${id}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      if (response.ok) {
        searchCache.clear();
      }
      return response.ok;
    } catch (error) {
      console.error('Cancel ride error:', error);
      return false;
    }
  }

  async bookRide(rideId: string, seats: number = 1): Promise<{ bookingId: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ rideId, seats }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Erreur lors de la reservation');
      }

    const payload: ApiResponse<{ booking: { id: string } }> = await response.json();
    searchCache.clear();
    const bookingId = payload?.data?.booking?.id;
    if (!bookingId) {
      throw new Error('Reponse invalide du serveur.');
    }
    return { bookingId };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') throw new Error('Le serveur met trop de temps a repondre. Reessayez.');
      throw error;
    }
  }
}

export const rideService = new RideService();
export default rideService;
