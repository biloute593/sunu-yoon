const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
}

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

      const response = await fetch(`${API_URL}/rides?${queryParams.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error('Search rides failed:', response.status);
        return [];
      }

      const data = await response.json();
      return data.rides || data || [];
    } catch (error) {
      console.error('Search rides error:', error);
      // Retourner des données de démonstration si l'API n'est pas disponible
      return this.getMockRides(params);
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
    const response = await fetch(`${API_URL}/rides`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la création du trajet');
    }

    return await response.json();
  }

  // Récupérer mes trajets publiés
  async getMyRides(): Promise<Ride[]> {
    try {
      const response = await fetch(`${API_URL}/rides/my-rides`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.rides || data || [];
    } catch (error) {
      console.error('Get my rides error:', error);
      return [];
    }
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
    const mockRides: Ride[] = [
      {
        id: 'demo-1',
        driver: {
          id: 'driver-1',
          firstName: 'Amadou',
          lastName: 'Diallo',
          avatarUrl: 'https://ui-avatars.com/api/?name=Amadou+Diallo&background=10b981&color=fff',
          rating: 4.8,
          reviewCount: 45,
          isVerified: true
        },
        origin: params.origin || 'Dakar',
        destination: params.destination || 'Saint-Louis',
        departureTime: new Date(Date.now() + 3600000 * 3).toISOString(),
        price: 3500,
        currency: 'XOF',
        seatsAvailable: 3,
        totalSeats: 4,
        carModel: 'Toyota Corolla',
        description: 'Voyage confortable avec climatisation',
        features: ['Climatisation', 'Musique', 'Bagages acceptés'],
        estimatedDuration: '3h30',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-2',
        driver: {
          id: 'driver-2',
          firstName: 'Fatou',
          lastName: 'Sow',
          avatarUrl: 'https://ui-avatars.com/api/?name=Fatou+Sow&background=3b82f6&color=fff',
          rating: 4.9,
          reviewCount: 78,
          isVerified: true
        },
        origin: params.origin || 'Dakar',
        destination: params.destination || 'Thiès',
        departureTime: new Date(Date.now() + 3600000 * 5).toISOString(),
        price: 2000,
        currency: 'XOF',
        seatsAvailable: 2,
        totalSeats: 4,
        carModel: 'Peugeot 308',
        description: 'Trajet direct sans arrêt',
        features: ['Climatisation', 'Non-fumeur'],
        estimatedDuration: '1h15',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-3',
        driver: {
          id: 'driver-3',
          firstName: 'Moussa',
          lastName: 'Ndiaye',
          avatarUrl: 'https://ui-avatars.com/api/?name=Moussa+Ndiaye&background=f59e0b&color=fff',
          rating: 4.6,
          reviewCount: 32,
          isVerified: false
        },
        origin: params.origin || 'Dakar',
        destination: params.destination || 'Touba',
        departureTime: new Date(Date.now() + 3600000 * 8).toISOString(),
        price: 4000,
        currency: 'XOF',
        seatsAvailable: 4,
        totalSeats: 5,
        carModel: 'Renault Duster',
        description: 'Véhicule spacieux pour vos bagages',
        features: ['Climatisation', 'Bagages acceptés', 'Animaux acceptés'],
        estimatedDuration: '4h00',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ];

    return mockRides;
  }
}

export const rideService = new RideService();
export default rideService;
