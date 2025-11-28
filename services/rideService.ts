import { ApiClient } from './apiClient';
import { Ride, DraftRide, User } from '../types';

interface SearchParams {
  origin: string;
  destination: string;
  date?: string;
  seats?: number;
}

interface RideDetails extends Ride {
  originAddress?: string;
  destinationAddress?: string;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  passengers: Array<{ id: string; name: string; avatarUrl: string; seats: number }>;
}

// Service de gestion des trajets
export const rideService = {
  // Rechercher des trajets
  async searchRides(params: SearchParams): Promise<Ride[]> {
    const queryParams = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      ...(params.date && { date: params.date }),
      ...(params.seats && { seats: params.seats.toString() })
    });

    const response = await ApiClient.get<{ rides: Ride[]; total: number }>(
      `/rides/search?${queryParams}`
    );

    return response.success ? response.data?.rides || [] : [];
  },

  // Obtenir les détails d'un trajet
  async getRideDetails(rideId: string): Promise<RideDetails | null> {
    const response = await ApiClient.get<{ ride: RideDetails; userBooking: any }>(
      `/rides/${rideId}`
    );

    return response.success ? response.data?.ride || null : null;
  },

  // Publier un nouveau trajet
  async createRide(draft: DraftRide): Promise<{ success: boolean; ride?: Ride; error?: string }> {
    const departureTime = `${draft.date}T${draft.time}:00`;
    
    const response = await ApiClient.post<{ ride: Ride }>('/rides', {
      originCity: draft.origin,
      destinationCity: draft.destination,
      departureTime,
      pricePerSeat: draft.price,
      totalSeats: draft.seats,
      features: draft.features,
      description: draft.description,
      estimatedDuration: 180 // À calculer selon la distance
    });

    if (response.success && response.data) {
      return { success: true, ride: response.data.ride };
    }

    return { 
      success: false, 
      error: response.error?.message || 'Erreur lors de la publication' 
    };
  },

  // Annuler un trajet
  async cancelRide(rideId: string): Promise<{ success: boolean; error?: string }> {
    const response = await ApiClient.post(`/rides/${rideId}/cancel`);
    return { 
      success: response.success, 
      error: response.error?.message 
    };
  },

  // Mes trajets publiés
  async getMyPublishedRides(): Promise<Ride[]> {
    const response = await ApiClient.get<{ rides: Ride[] }>('/rides/my/published');
    return response.success ? response.data?.rides || [] : [];
  }
};
