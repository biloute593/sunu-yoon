import { supabase, supabaseEnabled, DbRide, DbProfile } from './supabase';
import { ApiClient, API_BASE_URL } from './apiClient';
import { authService } from './authService';

const RIDES_DB_KEY = 'sunu_yoon_rides_db';
const BOOKINGS_DB_KEY = 'sunu_yoon_bookings_db';
const BACKEND_ENABLED = !!API_BASE_URL;

const getRidesDb = (): Record<string, Ride> => {
  try { return JSON.parse(localStorage.getItem(RIDES_DB_KEY) || '{}'); }
  catch { return {}; }
};

const saveRidesDb = (db: Record<string, Ride>): void => {
  localStorage.setItem(RIDES_DB_KEY, JSON.stringify(db));
};

interface LocalBooking {
  id: string; rideId: string; userId: string;
  seats: number; status: string; createdAt: string;
  paymentMethod?: string | null;
}

const getBookingsDb = (): Record<string, LocalBooking> => {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_DB_KEY) || '{}'); }
  catch { return {}; }
};

const saveBookingsDb = (db: Record<string, LocalBooking>): void => {
  localStorage.setItem(BOOKINGS_DB_KEY, JSON.stringify(db));
};

const getLocalCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('sunu_yoon_user') || 'null'); }
  catch { return null; }
};

const genId = (prefix: string) =>
  prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);



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

class RideService {
  private _isBackendAuth(): boolean {
    return authService.getAuthProvider() === 'backend';
  }

  private _isSupabaseAuth(): boolean {
    return authService.getAuthProvider() === 'supabase' && !!supabaseEnabled && !!supabase;
  }

  private _backendToRide(row: any): Ride {
    const driverName = row?.driver?.name
      || [row?.driver?.firstName, row?.driver?.lastName].filter(Boolean).join(' ').trim()
      || 'Conducteur';

    return {
      id: row.id,
      type: row.type === 'guest' ? 'guest' : 'registered',
      isGuest: !!row.isGuest,
      driver: {
        id: row.driver?.id || '',
        firstName: row.driver?.firstName || driverName.split(' ')[0] || 'Conducteur',
        lastName: row.driver?.lastName || driverName.split(' ').slice(1).join(' ') || '',
        name: driverName,
        avatarUrl: row.driver?.avatarUrl,
        rating: row.driver?.rating ?? null,
        reviewCount: row.driver?.reviewCount ?? 0,
        isVerified: row.driver?.isVerified ?? false,
        isGuest: row.driver?.isGuest ?? !!row.isGuest,
        phone: row.driver?.phone
      },
      driverContact: row.driverContact || null,
      origin: row.origin,
      originAddress: row.originAddress || null,
      destination: row.destination,
      destinationAddress: row.destinationAddress || null,
      departureTime: row.departureTime,
      duration: row.duration || '2h 00m',
      estimatedDuration: row.estimatedDuration ?? null,
      price: row.price,
      currency: row.currency || 'XOF',
      seatsAvailable: row.seatsAvailable,
      totalSeats: row.totalSeats,
      carModel: row.carModel || null,
      description: row.description || null,
      features: row.features || [],
      status: row.status || 'OPEN',
      createdAt: row.createdAt || new Date().toISOString(),
      distance: row.distance ?? null,
      originCoords: row.originCoords || null,
      destinationCoords: row.destinationCoords || null,
      passengers: row.passengers || []
    };
  }

  private async _fetchBackendRides(params: RideSearchParams = {}): Promise<Ride[]> {
    const searchParams = new URLSearchParams();
    if (params.origin?.trim()) searchParams.set('origin', params.origin.trim());
    if (params.destination?.trim()) searchParams.set('destination', params.destination.trim());
    if (params.date?.trim()) searchParams.set('date', params.date.trim());
    if (params.seats) searchParams.set('seats', params.seats.toString());

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await ApiClient.get<{ rides: any[] }>(`/rides${suffix}`);
    if (!response.success || !response.data?.rides) {
      throw new Error('Impossible de charger les trajets depuis le backend.');
    }

    return response.data.rides.map((ride: any) => this._backendToRide(ride));
  }

  // ── Convertisseur DB→Ride ──────────────────────────────────────────────────
  private _dbToRide(row: DbRide & { driver?: DbProfile }): Ride {
    const driver = row.driver;
    const fullName = driver?.name || 'Conducteur';
    const dur = row.estimated_duration
      ? `${Math.floor(row.estimated_duration / 60)}h ${String(row.estimated_duration % 60).padStart(2, '0')}m`
      : '2h 00m';
    return {
      id: row.id,
      type: 'registered',
      isGuest: false,
      driver: {
        id: row.driver_id,
        firstName: fullName.split(' ')[0] || '',
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        name: fullName,
        avatarUrl: driver?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff`,
        rating: driver?.rating ?? 5.0,
        reviewCount: driver?.review_count ?? 0,
        isVerified: driver?.is_verified ?? true,
        isGuest: false,
      },
      driverContact: null,
      origin: row.origin,
      originAddress: row.origin_address,
      destination: row.destination,
      destinationAddress: row.destination_address,
      departureTime: row.departure_time,
      duration: dur,
      estimatedDuration: row.estimated_duration,
      price: row.price,
      currency: row.currency,
      seatsAvailable: row.seats_available,
      totalSeats: row.total_seats,
      carModel: row.car_model,
      description: row.description,
      features: row.features || [],
      status: row.status,
      createdAt: row.created_at,
      distance: null,
      originCoords: null,
      destinationCoords: null,
      passengers: [],
    };
  }

  // ── searchRides ────────────────────────────────────────────────────────────
  async searchRides(params: RideSearchParams = {}): Promise<Ride[]> {
    if (BACKEND_ENABLED) {
      try {
        return await this._fetchBackendRides(params);
      } catch {
        // Fallback Supabase/local si le backend n'est pas disponible.
      }
    }

    if (this._isSupabaseAuth()) {
      let query = supabase
        .from('rides')
        .select('*, driver:profiles(*)')
        .eq('status', 'OPEN')
        .gte('seats_available', params.seats || 1)
        .order('departure_time', { ascending: true });

      if (params.origin?.trim()) {
        query = query.ilike('origin', `%${params.origin.trim()}%`);
      }
      if (params.destination?.trim()) {
        query = query.ilike('destination', `%${params.destination.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(r => this._dbToRide(r as DbRide & { driver: DbProfile }));
    }
    // Fallback localStorage
    const db = getRidesDb();
    const origin = params.origin?.trim().toLowerCase();
    const destination = params.destination?.trim().toLowerCase();
    const minSeats = params.seats || 1;
    return Object.values(db)
      .filter(ride => {
        const matchOrigin = !origin ||
          ride.origin.toLowerCase().includes(origin) ||
          (ride.originAddress?.toLowerCase().includes(origin) ?? false);
        const matchDest = !destination ||
          ride.destination.toLowerCase().includes(destination) ||
          (ride.destinationAddress?.toLowerCase().includes(destination) ?? false);
        return matchOrigin && matchDest && ride.seatsAvailable >= minSeats && ride.status === 'OPEN';
      })
      .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  }

  // ── getRide ────────────────────────────────────────────────────────────────
  async getRide(id: string): Promise<Ride | null> {
    if (BACKEND_ENABLED) {
      try {
        const response = await ApiClient.get<{ ride: any }>(`/rides/${id}`);
        if (response.success && response.data?.ride) {
          return this._backendToRide(response.data.ride);
        }
      } catch {
        // Fallback Supabase/local
      }
    }

    if (this._isSupabaseAuth()) {
      const { data, error } = await supabase
        .from('rides')
        .select('*, driver:profiles(*)')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return this._dbToRide(data as DbRide & { driver: DbProfile });
    }
    return getRidesDb()[id] ?? null;
  }

  // ── createRide ─────────────────────────────────────────────────────────────
  async createRide(data: CreateRideData): Promise<Ride> {
    const user = getLocalCurrentUser();
    if (!user) throw new Error('Vous devez être connecté pour créer un trajet.');

    if (this._isBackendAuth()) {
      const response = await ApiClient.post<{ ride: { id: string } }>('/rides', data);
      if (!response.success || !response.data?.ride?.id) {
        throw new Error(response.error?.message || response.message || 'Impossible de publier ce trajet.');
      }

      const createdRide = await this.getRide(response.data.ride.id);
      if (!createdRide) {
        throw new Error('Trajet créé mais introuvable au rechargement.');
      }
      return createdRide;
    }

    if (this._isSupabaseAuth()) {
      const { data: row, error } = await supabase
        .from('rides')
        .insert({
          driver_id: user.id,
          origin: data.originCity,
          origin_address: data.originAddress || data.originCity,
          destination: data.destinationCity,
          destination_address: data.destinationAddress || data.destinationCity,
          departure_time: data.departureTime,
          estimated_duration: data.estimatedDuration || 120,
          price: data.pricePerSeat,
          seats_available: data.totalSeats,
          total_seats: data.totalSeats,
          car_model: data.carModel || null,
          features: data.features || [],
          description: data.description || null,
          status: 'OPEN',
        })
        .select('*, driver:profiles(*)')
        .single();
      if (error) throw new Error(error.message);
      return this._dbToRide(row as DbRide & { driver: DbProfile });
    }

    // Fallback localStorage
    const fullName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Conducteur';
    const id = genId('ride');
    const dur = data.estimatedDuration
      ? `${Math.floor(data.estimatedDuration / 60)}h ${String(data.estimatedDuration % 60).padStart(2, '0')}m`
      : '2h 00m';
    const ride: Ride = {
      id, type: 'registered', isGuest: false,
      driver: {
        id: user.id,
        firstName: user.firstName || fullName.split(' ')[0] || '',
        lastName: user.lastName || fullName.split(' ').slice(1).join(' ') || '',
        name: fullName,
        avatarUrl: user.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff`,
        rating: user.rating ?? 5.0, reviewCount: user.reviewCount ?? 0,
        isVerified: true, isGuest: false, phone: user.phone || ''
      },
      driverContact: user.phone ? {
        phone: user.phone,
        whatsappUrl: `https://wa.me/${user.phone.replace(/\D/g, '')}`,
        callUrl: `tel:${user.phone}`
      } : null,
      origin: data.originCity, originAddress: data.originAddress || data.originCity,
      destination: data.destinationCity, destinationAddress: data.destinationAddress || data.destinationCity,
      departureTime: data.departureTime,
      duration: dur, estimatedDuration: data.estimatedDuration || 120,
      price: data.pricePerSeat, currency: 'XOF',
      seatsAvailable: data.totalSeats, totalSeats: data.totalSeats,
      carModel: data.carModel || null, description: data.description || null,
      features: data.features || [], status: 'OPEN',
      createdAt: new Date().toISOString(),
      distance: data.distance || null, originCoords: null, destinationCoords: null, passengers: []
    };
    const db = getRidesDb(); db[id] = ride; saveRidesDb(db);
    return ride;
  }

  async createGuestRide(data: CreateGuestRideData): Promise<Ride> {
    if (BACKEND_ENABLED) {
      try {
        const response = await fetch(`${API_BASE_URL}/rides/guest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload?.data?.ride) {
            return this._backendToRide(payload.data.ride);
          }
        }
      } catch {
        // Fallback local si le backend n'est pas disponible.
      }
    }

    const fullName = data.driverName;
    const id = genId('ride');
    const dur = data.estimatedDuration
      ? `${Math.floor(data.estimatedDuration / 60)}h ${String(data.estimatedDuration % 60).padStart(2, '0')}m`
      : '2h 00m';
    const ride: Ride = {
      id, type: 'guest', isGuest: true,
      driver: {
        id: 'guest_' + id,
        firstName: fullName.split(' ')[0] || fullName,
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        name: fullName,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=059669&color=fff`,
        rating: null, reviewCount: 0, isVerified: false, isGuest: true, phone: data.driverPhone
      },
      driverContact: {
        phone: data.driverPhone,
        whatsappUrl: `https://wa.me/${data.driverPhone.replace(/\D/g, '')}`,
        callUrl: `tel:${data.driverPhone}`
      },
      origin: data.originCity, originAddress: data.originAddress || data.originCity,
      destination: data.destinationCity, destinationAddress: data.destinationAddress || data.destinationCity,
      departureTime: data.departureTime,
      duration: dur, estimatedDuration: data.estimatedDuration || 120,
      price: data.pricePerSeat, currency: 'XOF',
      seatsAvailable: data.availableSeats ?? data.totalSeats ?? 3,
      totalSeats: data.totalSeats ?? data.availableSeats ?? 3,
      carModel: data.carModel || null, description: data.description || null,
      features: data.features || [], status: 'OPEN',
      createdAt: new Date().toISOString(),
      distance: null, originCoords: null, destinationCoords: null, passengers: []
    };
    const db = getRidesDb(); db[id] = ride; saveRidesDb(db);
    return ride;
  }

  // ── getMyRides ─────────────────────────────────────────────────────────────
  async getMyRides(): Promise<Ride[]> {
    const user = getLocalCurrentUser();
    if (!user) return [];

    if (this._isBackendAuth()) {
      const response = await ApiClient.get<{ rides: any[] }>('/rides/my-rides');
      if (!response.success) {
        throw new Error(response.error?.message || response.message || 'Impossible de charger vos trajets.');
      }
      return (response.data?.rides || []).map((ride) => this._backendToRide(ride));
    }

    if (this._isSupabaseAuth()) {
      const { data, error } = await supabase
        .from('rides')
        .select('*, driver:profiles(*)')
        .eq('driver_id', user.id)
        .order('departure_time', { ascending: false });
      if (error) return [];
      return (data || []).map(r => this._dbToRide(r as DbRide & { driver: DbProfile }));
    }
    const db = getRidesDb();
    return Object.values(db).filter(ride => ride.driver.id === user.id);
  }

  // ── cancelRide ─────────────────────────────────────────────────────────────
  async cancelRide(id: string): Promise<boolean> {
    if (this._isBackendAuth()) {
      const response = await ApiClient.post(`/rides/${id}/cancel`);
      if (!response.success) {
        throw new Error(response.error?.message || response.message || 'Impossible d\'annuler ce trajet.');
      }
      return true;
    }

    if (this._isSupabaseAuth()) {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'CANCELLED' })
        .eq('id', id);
      return !error;
    }
    const db = getRidesDb();
    if (!db[id]) return false;
    db[id].status = 'CANCELLED';
    saveRidesDb(db);
    return true;
  }

  // ── bookRide ───────────────────────────────────────────────────────────────
  async bookRide(rideId: string, seats: number = 1, paymentMethod?: string): Promise<{ bookingId: string }> {
    const user = getLocalCurrentUser();

    if (this._isBackendAuth()) {
      const response = await ApiClient.post<{ booking: { id: string } }>('/bookings', {
        rideId,
        seats,
        paymentMethod: paymentMethod || null
      });

      if (!response.success || !response.data?.booking?.id) {
        throw new Error(response.error?.message || response.message || 'Erreur lors de la réservation.');
      }

      return { bookingId: response.data.booking.id };
    }

    if (this._isSupabaseAuth()) {
      // Lire le trajet pour vérifier les places
      const { data: ride, error: rideErr } = await supabase
        .from('rides')
        .select('seats_available, price')
        .eq('id', rideId)
        .single();
      if (rideErr || !ride) throw new Error('Trajet introuvable.');
      if (ride.seats_available < seats)
        throw new Error(`Seulement ${ride.seats_available} place(s) disponible(s).`);

      if (!user) throw new Error('Vous devez être connecté pour réserver.');

      // Décrémenter les places
      const { error: updateErr } = await supabase
        .from('rides')
        .update({ seats_available: ride.seats_available - seats })
        .eq('id', rideId);
      if (updateErr) throw new Error('Impossible de réserver ce trajet.');

      // Créer la réservation
      const { data: booking, error: bookErr } = await supabase
        .from('bookings')
        .insert({
          ride_id: rideId,
          passenger_id: user.id,
          seats,
          total_price: ride.price * seats,
          status: 'PENDING',
          payment_method: paymentMethod || null,
        })
        .select('id')
        .single();
      if (bookErr) throw new Error('Erreur lors de la réservation.');
      return { bookingId: booking.id };
    }

    // Fallback localStorage
    await new Promise(r => setTimeout(r, 600));
    const db = getRidesDb();
    const ride = db[rideId];
    if (!ride) throw new Error('Trajet introuvable.');
    if (ride.seatsAvailable < seats)
      throw new Error(`Seulement ${ride.seatsAvailable} place(s) disponible(s).`);

    const bookingId = genId('booking');
    ride.seatsAvailable -= seats;
    ride.status = ride.seatsAvailable <= 0 ? 'FULL' : 'OPEN';
    if (user) {
      ride.passengers = [...(ride.passengers || []), {
        id: user.id, bookingId,
        name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' '),
        avatarUrl: user.avatarUrl, seats, status: 'PENDING'
      }];
    }
    db[rideId] = ride; saveRidesDb(db);
    const bookingsDb = getBookingsDb();
    bookingsDb[bookingId] = {
      id: bookingId,
      rideId,
      userId: user?.id || 'guest',
      seats,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      paymentMethod: paymentMethod || null
    };
    saveBookingsDb(bookingsDb);
    return { bookingId };
  }
}

export const rideService = new RideService();
export default rideService;
