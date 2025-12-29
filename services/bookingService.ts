import { ApiClient } from './apiClient';
import { PaymentMethod } from './paymentService';

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

export interface GuestBooking {
  id: string;
  status: 'pending' | 'notified' | 'cancelled' | 'confirmed';
  seats: number;
  passenger: {
    name: string;
    phone: string;
    contactPreference?: 'call' | 'whatsapp' | 'sms';
  };
  paymentMethod: PaymentMethod;
  notes?: string;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
    driver: {
      name: string;
      phone?: string | null;
      email?: string | null;
    };
  };
  remainingSeats: number;
}

export interface CreateGuestBookingData {
  rideId: string;
  seats?: number;
  passengerName: string;
  passengerPhone: string;
  paymentMethod?: PaymentMethod;
  contactPreference?: 'call' | 'whatsapp' | 'sms';
  notes?: string;
}

// Service de gestion des réservations (Mock LocalStorage)
export const bookingService = {
  // Créer une réservation invité sans compte
  async createBooking(data: CreateGuestBookingData): Promise<GuestBooking> {
    // Simulation d'un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1000));

    const bookings = JSON.parse(localStorage.getItem('sunu_yoon_bookings') || '[]');
    
    // Récupérer les détails du trajet pour l'objet retourné
    const rides = JSON.parse(localStorage.getItem('sunu_yoon_local_rides') || '[]');
    const ride = rides.find((r: any) => r.id === data.rideId);

    if (!ride) {
      throw new Error('Trajet introuvable');
    }

    const newBooking: GuestBooking = {
      id: 'bk_' + Date.now(),
      status: 'pending',
      seats: data.seats || 1,
      passenger: {
        name: data.passengerName,
        phone: data.passengerPhone,
        contactPreference: data.contactPreference
      },
      paymentMethod: data.paymentMethod || 'CASH',
      notes: data.notes,
      ride: {
        id: ride.id,
        origin: ride.origin,
        destination: ride.destination,
        departureTime: ride.departureTime,
        driver: {
          name: ride.driver.firstName + ' ' + (ride.driver.lastName || ''),
          phone: ride.driver.phone || '770000000', // Fallback phone
          email: null
        }
      },
      remainingSeats: ride.seatsAvailable - (data.seats || 1)
    };

    bookings.push(newBooking);
    localStorage.setItem('sunu_yoon_bookings', JSON.stringify(bookings));

    // Mettre à jour les places disponibles du trajet
    const updatedRides = rides.map((r: any) => {
      if (r.id === data.rideId) {
        return { ...r, seatsAvailable: r.seatsAvailable - (data.seats || 1) };
      }
      return r;
    });
    localStorage.setItem('sunu_yoon_local_rides', JSON.stringify(updatedRides));

    return newBooking;
  },

  // Mes réservations (en tant que passager)
  async getMyBookings(): Promise<GuestBooking[]> {
    const bookings = JSON.parse(localStorage.getItem('sunu_yoon_bookings') || '[]');
    // Dans une vraie app, on filtrerait par ID utilisateur. Ici on retourne tout pour la démo.
    return bookings.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  // Les demandes sur mes trajets (en tant que conducteur)
  async getDriverRequests(): Promise<GuestBooking[]> {
    const bookings = JSON.parse(localStorage.getItem('sunu_yoon_bookings') || '[]');
    // Pour la démo, on retourne toutes les réservations en attente
    return bookings.filter((b: any) => b.status === 'pending');
  },

  // Confirmer une réservation
  async confirmBooking(bookingId: string): Promise<void> {
    const bookings = JSON.parse(localStorage.getItem('sunu_yoon_bookings') || '[]');
    const updatedBookings = bookings.map((b: any) => {
      if (b.id === bookingId) {
        return { ...b, status: 'confirmed' };
      }
      return b;
    });
    localStorage.setItem('sunu_yoon_bookings', JSON.stringify(updatedBookings));
  },

  // Annuler une réservation
  async cancelBooking(bookingId: string): Promise<{ success: boolean }> {
    const bookings = JSON.parse(localStorage.getItem('sunu_yoon_bookings') || '[]');
    const updatedBookings = bookings.map((b: any) => {
      if (b.id === bookingId) {
        return { ...b, status: 'cancelled' };
      }
      return b;
    });
    localStorage.setItem('sunu_yoon_bookings', JSON.stringify(updatedBookings));
    return { success: true };
  }
};
