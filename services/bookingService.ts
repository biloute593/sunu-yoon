import { supabase, supabaseEnabled } from './supabase';
import { PaymentMethod } from './paymentService';
import { notificationService } from './notificationService';
import { ApiClient, API_BASE_URL } from './apiClient';
import { authService } from './authService';

const LOCAL_RIDES_DB_KEY = 'sunu_yoon_rides_db';
const LOCAL_BOOKINGS_DB_KEY = 'sunu_yoon_bookings_db';
const BACKEND_ENABLED = !!API_BASE_URL;

interface LocalStoredBooking {
  id: string;
  rideId: string;
  userId: string;
  seats: number;
  status: string;
  createdAt: string;
  paymentMethod?: PaymentMethod | null;
}

interface LocalStoredRide {
  id: string;
  origin: string;
  originAddress?: string;
  destination: string;
  destinationAddress?: string;
  departureTime: string;
  duration?: string;
  estimatedDuration?: number | null;
  price: number;
  currency?: string;
  status?: string;
  seatsAvailable: number;
  totalSeats?: number;
  features?: string[];
  passengers?: Array<{ id: string; bookingId?: string; name: string; avatarUrl?: string; seats: number; status?: string }>;
  driver: {
    id: string;
    name?: string;
    avatarUrl?: string;
    phone?: string;
    rating?: number | null;
  };
}

const getLocalCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('sunu_yoon_user') || 'null') as { id: string } | null;
  } catch {
    return null;
  }
};

const loadLocalBookings = (): Record<string, LocalStoredBooking> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_BOOKINGS_DB_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveLocalBookings = (bookings: Record<string, LocalStoredBooking>): void => {
  localStorage.setItem(LOCAL_BOOKINGS_DB_KEY, JSON.stringify(bookings));
};

const loadLocalRides = (): Record<string, LocalStoredRide> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_RIDES_DB_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveLocalRides = (rides: Record<string, LocalStoredRide>): void => {
  localStorage.setItem(LOCAL_RIDES_DB_KEY, JSON.stringify(rides));
};

const normalizeBookingStatus = (status?: string): Booking['status'] => {
  if (status === 'CONFIRMED' || status === 'CANCELLED' || status === 'COMPLETED') {
    return status;
  }
  return 'PENDING';
};

const isBackendAuth = (): boolean => authService.getAuthProvider() === 'backend';
const isSupabaseAuth = (): boolean => authService.getAuthProvider() === 'supabase' && !!supabaseEnabled && !!supabase;

const backendBookingToBooking = (booking: any): Booking => ({
  id: booking.id,
  seats: booking.seats,
  totalPrice: booking.totalPrice,
  status: normalizeBookingStatus(booking.status),
  pickupAddress: booking.pickupAddress || undefined,
  createdAt: booking.createdAt,
  ride: {
    id: booking.ride?.id || '',
    origin: booking.ride?.origin || '',
    originAddress: booking.ride?.originAddress || undefined,
    destination: booking.ride?.destination || '',
    destinationAddress: booking.ride?.destinationAddress || undefined,
    departureTime: booking.ride?.departureTime || '',
    duration: booking.ride?.duration || '2h 00m',
    driver: {
      id: booking.ride?.driver?.id || '',
      name: booking.ride?.driver?.name || 'Conducteur',
      avatarUrl: booking.ride?.driver?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.ride?.driver?.name || 'Conducteur')}&background=10b981&color=fff`,
      phone: booking.ride?.driver?.phone,
      rating: booking.ride?.driver?.rating || 5.0,
    },
    features: booking.ride?.features || [],
  },
  payment: booking.payment ? {
    status: booking.payment.status,
    method: booking.payment.method,
    paidAt: booking.payment.paidAt || undefined,
  } : undefined,
});

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
  status: 'pending' | 'notified' | 'cancelled';
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

// Service de gestion des réservations
export const bookingService = {
  // Créer une réservation invité sans compte
  async createBooking(data: CreateGuestBookingData): Promise<GuestBooking> {
    if (supabaseEnabled && supabase) {
      // Récupérer les infos du trajet
      const { data: ride, error: rideErr } = await supabase
        .from('rides')
        .select('id, origin, destination, departure_time, price, seats_available, driver:profiles(name, phone)')
        .eq('id', data.rideId)
        .single();

      if (rideErr || !ride) throw new Error('Trajet introuvable');

      const totalPrice = (ride.price || 0) * (data.seats || 1);

      const { data: booking, error } = await supabase
        .from('guest_bookings')
        .insert({
          ride_id: data.rideId,
          passenger_name: data.passengerName,
          passenger_phone: data.passengerPhone,
          seats: data.seats || 1,
          total_price: totalPrice,
          payment_method: data.paymentMethod || 'CASH',
          contact_preference: data.contactPreference,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      notificationService.push(
        'booking',
        'Réservation envoyée',
        `Votre réservation pour ${ride.origin} → ${ride.destination} a été envoyée au conducteur.`
      );

      const driver = (ride as any).driver as { name?: string; phone?: string } | null;
      return {
        id: booking.id,
        status: booking.status,
        seats: booking.seats,
        passenger: {
          name: data.passengerName,
          phone: data.passengerPhone,
          contactPreference: data.contactPreference,
        },
        paymentMethod: booking.payment_method as PaymentMethod,
        notes: booking.notes,
        ride: {
          id: ride.id,
          origin: ride.origin,
          destination: ride.destination,
          departureTime: ride.departure_time,
          driver: { name: driver?.name || '', phone: driver?.phone || null, email: null },
        },
        remainingSeats: Math.max(0, (ride.seats_available || 0) - (data.seats || 1)),
      };
    }

    // Fallback localStorage
    const id = 'gbooking_' + Date.now().toString(36);
    const booking: GuestBooking = {
      id,
      status: 'pending',
      seats: data.seats || 1,
      passenger: { name: data.passengerName, phone: data.passengerPhone, contactPreference: data.contactPreference },
      paymentMethod: data.paymentMethod || 'CASH',
      notes: data.notes,
      ride: {
        id: data.rideId,
        origin: 'Départ',
        destination: 'Arrivée',
        departureTime: new Date().toISOString(),
        driver: { name: 'Conducteur', phone: null, email: null },
      },
      remainingSeats: 0,
    };
    const stored = JSON.parse(localStorage.getItem('sunu_yoon_guest_bookings') || '[]');
    stored.push(booking);
    localStorage.setItem('sunu_yoon_guest_bookings', JSON.stringify(stored));
    notificationService.push('booking', 'Réservation enregistrée', 'Votre réservation a été enregistrée.');
    return booking;
  },

  // Mes réservations (utilisateur connecté)
  async getMyBookings(status?: string): Promise<Booking[]> {
    if (BACKEND_ENABLED && isBackendAuth()) {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
      const response = await ApiClient.get<{ bookings: any[] }>(`/bookings/my${suffix}`);
      if (!response.success) {
        throw new Error(response.error?.message || response.message || 'Impossible de charger vos réservations.');
      }
      return (response.data?.bookings || []).map((booking) => backendBookingToBooking(booking));
    }

    if (isSupabaseAuth()) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('bookings')
        .select(`
          id, seats, total_price, status, payment_method, created_at,
          ride:rides(
            id, origin, origin_address, destination, destination_address,
            departure_time, estimated_duration,
            driver:profiles(id, name, avatar_url, phone, rating)
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((b: any) => ({
        id: b.id,
        seats: b.seats,
        totalPrice: b.total_price,
        status: b.status,
        createdAt: b.created_at,
        ride: {
          id: b.ride?.id || '',
          origin: b.ride?.origin || '',
          originAddress: b.ride?.origin_address,
          destination: b.ride?.destination || '',
          destinationAddress: b.ride?.destination_address,
          departureTime: b.ride?.departure_time || '',
          duration: b.ride?.estimated_duration
            ? `${Math.floor(b.ride.estimated_duration / 60)}h ${String(b.ride.estimated_duration % 60).padStart(2, '0')}m`
            : '2h 00m',
          driver: {
            id: b.ride?.driver?.id || '',
            name: b.ride?.driver?.name || '',
            avatarUrl: b.ride?.driver?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(b.ride?.driver?.name || 'D')}&background=10b981&color=fff`,
            phone: b.ride?.driver?.phone,
            rating: b.ride?.driver?.rating || 5.0,
          },
          features: [],
        },
        payment: b.payment_method ? { status: b.status, method: b.payment_method } : undefined,
      }));
    }

    const currentUser = getLocalCurrentUser();
    if (!currentUser) {
      return [];
    }

    const rides = loadLocalRides();
    const bookings = Object.values(loadLocalBookings())
      .filter((booking) => booking.userId === currentUser.id)
      .filter((booking) => !status || booking.status === status)
      .map((booking) => {
        const ride = rides[booking.rideId];
        if (!ride) {
          return null;
        }

        const duration = ride.duration
          || (ride.estimatedDuration
            ? `${Math.floor(ride.estimatedDuration / 60)}h ${String(ride.estimatedDuration % 60).padStart(2, '0')}m`
            : '2h 00m');

        return {
          id: booking.id,
          seats: booking.seats,
          totalPrice: ride.price * booking.seats,
          status: normalizeBookingStatus(booking.status),
          createdAt: booking.createdAt,
          ride: {
            id: ride.id,
            origin: ride.origin,
            originAddress: ride.originAddress,
            destination: ride.destination,
            destinationAddress: ride.destinationAddress,
            departureTime: ride.departureTime,
            duration,
            driver: {
              id: ride.driver.id,
              name: ride.driver.name || 'Conducteur',
              avatarUrl: ride.driver.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driver.name || 'Conducteur')}&background=10b981&color=fff`,
              phone: ride.driver.phone,
              rating: ride.driver.rating || 5.0,
            },
            features: ride.features || [],
          },
          payment: booking.paymentMethod ? { status: normalizeBookingStatus(booking.status), method: booking.paymentMethod } : undefined,
        } as Booking;
      })
      .filter((booking): booking is Booking => booking !== null)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return bookings;
  },

  // Annuler une réservation
  async cancelBooking(bookingId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    if (BACKEND_ENABLED && isBackendAuth()) {
      const response = await ApiClient.post(`/bookings/${bookingId}/cancel`);
      if (!response.success) {
        return { success: false, error: response.error?.message || response.message || 'Impossible d\'annuler cette réservation.' };
      }
      notificationService.push('cancel', 'Réservation annulée', 'Votre réservation a été annulée.');
      return { success: true, message: response.message || 'Réservation annulée' };
    }

    if (isSupabaseAuth()) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'CANCELLED' })
        .eq('id', bookingId);
      if (error) return { success: false, error: error.message };
      notificationService.push('cancel', 'Réservation annulée', 'Votre réservation a été annulée.');
      return { success: true, message: 'Réservation annulée' };
    }

    const currentUser = getLocalCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    const bookings = loadLocalBookings();
    const booking = bookings[bookingId];
    if (!booking || booking.userId !== currentUser.id) {
      return { success: false, error: 'Réservation introuvable' };
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return { success: false, error: 'Cette réservation ne peut plus être annulée' };
    }

    bookings[bookingId] = {
      ...booking,
      status: 'CANCELLED'
    };
    saveLocalBookings(bookings);

    const rides = loadLocalRides();
    const ride = rides[booking.rideId];
    if (ride) {
      ride.seatsAvailable += booking.seats;
      ride.status = 'OPEN';
      if (Array.isArray(ride.passengers)) {
        ride.passengers = ride.passengers.filter((passenger) => passenger.bookingId !== bookingId);
      }
      rides[booking.rideId] = ride;
      saveLocalRides(rides);
    }

    notificationService.push('cancel', 'Réservation annulée', 'Votre réservation a été annulée.');
    return { success: true, message: 'Réservation annulée' };
  },

  // Confirmer une réservation (conducteur)
  async confirmBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    if (BACKEND_ENABLED && isBackendAuth()) {
      const response = await ApiClient.post(`/bookings/${bookingId}/confirm`);
      if (!response.success) {
        return { success: false, error: response.error?.message || response.message || 'Impossible de confirmer cette réservation.' };
      }
      notificationService.push('confirm', 'Réservation confirmée', 'Le conducteur a confirmé votre réservation.');
      return { success: true };
    }

    if (isSupabaseAuth()) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'CONFIRMED' })
        .eq('id', bookingId);
      if (error) return { success: false, error: error.message };
      notificationService.push('confirm', 'Réservation confirmée', 'Le conducteur a confirmé votre réservation.');
      return { success: true };
    }

    const bookings = loadLocalBookings();
    const booking = bookings[bookingId];
    if (!booking) {
      return { success: false, error: 'Réservation introuvable' };
    }

    bookings[bookingId] = {
      ...booking,
      status: 'CONFIRMED'
    };
    saveLocalBookings(bookings);

    notificationService.push('confirm', 'Réservation confirmée', 'Le conducteur a confirmé votre réservation.');
    return { success: true };
  }
};
