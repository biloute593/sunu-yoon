import { ApiClient } from './apiClient';

export type PaymentMethod = 'WAVE' | 'ORANGE_MONEY' | 'CASH';

export interface Booking {
  id: string;
  seats: number;
  status: 'pending' | 'confirmed' | 'cancelled'; // normalized to lowercase
  createdAt: string;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
    driver: {
      id?: string;
      name: string;
      avatarUrl?: string;
      phone?: string;
    };
  };
}

export interface GuestBooking extends Booking {
  passenger: {
    name: string;
    phone: string;
    contactPreference?: 'call' | 'whatsapp' | 'sms';
  };
  notes?: string;
}

export interface CreateBookingData {
  rideId: string;
  seats: number;
  passengerName: string;
  passengerPhone: string;
  paymentMethod: PaymentMethod;
  contactPreference?: 'call' | 'whatsapp' | 'sms';
  notes?: string;
}

class BookingService {
  // Créer une réservation (Intelligente: API Auth ou Guest selon le cas)
  async createBooking(data: CreateBookingData): Promise<any> {
    try {
      // Vérifier si utilisateur connecté (via présence de token)
      const token = localStorage.getItem('token'); // Hypothèse: token stocké ici

      let endpoint = '/guest-bookings';
      // Si connecté, on utilise la route authentifiée qui est plus sûre/better
      if (token) {
        endpoint = '/bookings';
      }

      const payload = {
        rideId: data.rideId,
        seats: data.seats,
        passengerName: data.passengerName, // Utilisé par guest, ignoré par auth (prend profil)
        passengerPhone: data.passengerPhone, // Idem
        paymentMethod: data.paymentMethod,
        contactPreference: data.contactPreference,
        notes: data.notes
      };

      const response = await ApiClient.post<{ booking: any }>(endpoint, payload);

      if (!response.success) {
        throw new Error(response.error?.message || 'Erreur lors de la réservation');
      }

      return response.data?.booking;
    } catch (error) {
      console.error('Create booking error:', error);
      throw error;
    }
  }

  // Mes réservations
  async getMyBookings(): Promise<GuestBooking[]> {
    try {
      const response = await ApiClient.get<GuestBooking[]>('/bookings');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Get bookings error:', error);
      return [];
    }
  }

  // Demandes reçues (Conducteur)
  async getDriverRequests(): Promise<GuestBooking[]> {
    try {
      const response = await ApiClient.get<GuestBooking[]>('/bookings/requests');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Get requests error:', error);
      return [];
    }
  }

  // Confirmer une réservation
  async confirmBooking(bookingId: string): Promise<void> {
    const response = await ApiClient.post<any>(`/bookings/${bookingId}/confirm`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Erreur lors de la confirmation');
    }
  }

  // Annuler (Non implémenté en backend pour Guest, mais pour Auth oui)
  async cancelBooking(bookingId: string): Promise<{ success: boolean }> {
    // TODO: Implement cancel endpoint
    return { success: true };
  }
}

export const bookingService = new BookingService();

