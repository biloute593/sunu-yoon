import { randomUUID } from 'crypto';

export type GuestBookingStatus = 'pending' | 'notified' | 'cancelled';

export interface GuestBookingSnapshot {
  id: string;
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  seats: number;
  paymentMethod?: string;
  notes?: string;
  contactPreference?: 'call' | 'whatsapp' | 'sms';
  createdAt: string;
  status: GuestBookingStatus;
}

interface CreateGuestBookingInput {
  rideId: string;
  passengerName: string;
  passengerPhone: string;
  seats: number;
  paymentMethod?: string;
  notes?: string;
  contactPreference?: 'call' | 'whatsapp' | 'sms';
}

const EXPIRATION_MINUTES = 12 * 60; // 12h pour libérer automatiquement les réservations invitées

class GuestBookingStore {
  private bookings = new Map<string, GuestBookingSnapshot>();
  private phoneBookingCount = new Map<string, number>();
  private MAX_BOOKINGS_PER_PHONE = 5;

  create(payload: CreateGuestBookingInput) {
    this.pruneExpired();
    
    const phoneCount = this.phoneBookingCount.get(payload.passengerPhone) || 0;
    if (phoneCount >= this.MAX_BOOKINGS_PER_PHONE) {
      throw new Error(`Limite de ${this.MAX_BOOKINGS_PER_PHONE} réservations atteinte pour ce numéro`);
    }

    const id = randomUUID();
    const record: GuestBookingSnapshot = {
      id,
      rideId: payload.rideId,
      passengerName: payload.passengerName,
      passengerPhone: payload.passengerPhone,
      seats: payload.seats,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes,
      contactPreference: payload.contactPreference,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.bookings.set(id, record);
    this.phoneBookingCount.set(payload.passengerPhone, (this.phoneBookingCount.get(payload.passengerPhone) || 0) + 1);
    return record;
  }

  markNotified(id: string) {
    const current = this.bookings.get(id);
    if (!current) {
      return null;
    }
    const updated: GuestBookingSnapshot = { ...current, status: 'notified' };
    this.bookings.set(id, updated);
    return updated;
  }

  get(id: string) {
    this.pruneExpired();
    return this.bookings.get(id) || null;
  }

  private pruneExpired() {
    const expirationThreshold = Date.now() - EXPIRATION_MINUTES * 60 * 1000;
    for (const [id, booking] of this.bookings.entries()) {
      if (new Date(booking.createdAt).getTime() < expirationThreshold) {
        this.bookings.delete(id);
        const currentCount = this.phoneBookingCount.get(booking.passengerPhone) || 0;
        if (currentCount > 0) {
          this.phoneBookingCount.set(booking.passengerPhone, currentCount - 1);
        }
        if (this.phoneBookingCount.get(booking.passengerPhone) === 0) {
          this.phoneBookingCount.delete(booking.passengerPhone);
        }
      }
    }
  }
}

export const guestBookingStore = new GuestBookingStore();
