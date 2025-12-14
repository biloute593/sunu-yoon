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
  passengers?: Array<{ id: string; name: string; avatarUrl?: string; seats: number }>;
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
      return localStorage.getItem('sunu_yoon_token');
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

      const response = await fetch(`${API_URL}/rides?${queryParams.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        console.error('Search rides failed:', response.status);
        return [];
      }

      const payload: ApiResponse<{ rides: Ride[]; total: number }> = await response.json();
      const rides = Array.isArray(payload?.data?.rides) ? payload.data.rides : [];
      saveCachedResult(cacheKey, rides);
      return rides;
    } catch (error) {
      console.error('Search rides error:', error);
      return [];
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
    const response = await fetch(`${API_URL}/rides`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Erreur lors de la création du trajet');
    }

    const payload: ApiResponse<{ ride: Ride }> = await response.json();
    searchCache.clear();
    if (!payload?.data?.ride) {
      throw new Error('Réponse invalide du serveur.');
    }
    return payload.data.ride;
  }

  async createGuestRide(data: CreateGuestRideData): Promise<Ride> {
    const response = await fetch(`${API_URL}/rides/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Erreur lors de la publication du trajet');
    }

    const payload: ApiResponse<{ ride: Ride }> = await response.json();
    // Invalider le cache car un nouveau trajet vient d'être publié
    searchCache.clear();
    if (!payload?.data?.ride) {
      throw new Error('Réponse invalide du serveur.');
    }
    return payload.data.ride;
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
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ rideId, seats })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Erreur lors de la réservation');
    }

    searchCache.clear();
    return response.json();
  }
}

export const rideService = new RideService();
export default rideService;
