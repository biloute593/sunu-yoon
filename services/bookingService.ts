import { ApiClient } from './apiClient';

export interface Booking {
  id: string;
  seats: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  pickupAddress?: string;
  createdAt: string;
  ride: {
    id: string;
    origin: string;
    originAddress?: string;
    destination: string;
    destinationAddress?: string;
    departureTime: string;
    duration: string;
    driver: {
      id: string;
      name: string;
      avatarUrl: string;
      phone?: string;
      rating: number;
    };
    features: string[];
  };
  payment?: {
    status: string;
    method: string;
    paidAt?: string;
  };
}

export interface CreateBookingData {
  rideId: string;
  seats?: number;
}

// Service de gestion des réservations
export const bookingService = {
  // Créer une réservation
  async createBooking(data: CreateBookingData): Promise<Booking> {
    const response = await ApiClient.post<{ booking: Booking }>('/bookings', {
      rideId: data.rideId,
      seats: data.seats || 1
    });

    if (response.success && response.data?.booking) {
      return response.data.booking;
    }

    throw new Error(response.error?.message || 'Erreur lors de la réservation');
  },

  // Mes réservations
  async getMyBookings(status?: string): Promise<Booking[]> {
    const endpoint = status ? `/bookings/my?status=${status}` : '/bookings/my';
    const response = await ApiClient.get<{ bookings: Booking[] }>(endpoint);
    return response.success ? response.data?.bookings || [] : [];
  },

  // Annuler une réservation
  async cancelBooking(bookingId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await ApiClient.post<{ message: string }>(`/bookings/${bookingId}/cancel`);
    return { 
      success: response.success, 
      message: response.message,
      error: response.error?.message 
    };
  },

  // Confirmer une réservation (conducteur)
  async confirmBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const response = await ApiClient.post(`/bookings/${bookingId}/confirm`);
    return { 
      success: response.success, 
      error: response.error?.message 
    };
  }
};
