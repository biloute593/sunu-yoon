import { supabase, supabaseEnabled } from './supabase';
import { Coordinates } from '../types';

export interface TrackingUpdate {
  rideId: string;
  coords: Coordinates;
  speed?: number;
  heading?: number;
  senderId?: string;
  updatedAt: string;
  ended?: boolean;
  reason?: string;
}

type UpdateCallback = (update: TrackingUpdate) => void;
type ErrorCallback = (message: string) => void;

class TrackingService {
  private channels = new Map<string, ReturnType<NonNullable<typeof supabase>['channel']>>();
  private lastPushByRide = new Map<string, number>();
  private MIN_PUSH_INTERVAL_MS = 1500;

  async publishDriverLocation(rideId: string, payload: {
    coords: Coordinates;
    speed?: number;
    heading?: number;
    senderId?: string;
  }): Promise<void> {
    if (!rideId) return;

    const now = Date.now();
    if (now - (this.lastPushByRide.get(rideId) || 0) < this.MIN_PUSH_INTERVAL_MS) return;
    this.lastPushByRide.set(rideId, now);

    if (supabaseEnabled && supabase) {
      const ch = supabase.channel(`tracking:${rideId}`);
      ch.subscribe();
      await ch.send({
        type: 'broadcast',
        event: 'location',
        payload: {
          rideId,
          coords: payload.coords,
          speed: payload.speed,
          heading: payload.heading,
          senderId: payload.senderId,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  }

  async stopDriverTracking(rideId: string): Promise<void> {
    if (!rideId) return;
    if (supabaseEnabled && supabase) {
      const ch = supabase.channel(`tracking:${rideId}`);
      ch.subscribe();
      await ch.send({
        type: 'broadcast',
        event: 'location',
        payload: { rideId, ended: true, reason: 'driver_stopped', updatedAt: new Date().toISOString() },
      });
    }
    this.unsubscribeFromRide(rideId);
    this.lastPushByRide.delete(rideId);
  }

  async getLatestLocation(_rideId: string): Promise<TrackingUpdate | null> {
    // Broadcast channels ne persistent pas — impossible d'obtenir la dernière position
    return null;
  }

  subscribeToRide(
    rideId: string,
    onUpdate: UpdateCallback,
    onError?: ErrorCallback
  ): () => void {
    if (!rideId) {
      onError?.('Identifiant du trajet manquant.');
      return () => undefined;
    }

    if (!supabaseEnabled || !supabase) {
      onError?.('Le suivi en direct n\'est pas disponible.');
      return () => undefined;
    }

    this.unsubscribeFromRide(rideId);

    const channel = supabase
      .channel(`tracking:${rideId}`)
      .on('broadcast', { event: 'location' }, ({ payload }) => {
        onUpdate(payload as TrackingUpdate);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          onError?.('Erreur de connexion au suivi en direct.');
        }
      });

    this.channels.set(rideId, channel);
    return () => this.unsubscribeFromRide(rideId);
  }

  unsubscribeFromRide(rideId: string) {
    const existing = this.channels.get(rideId);
    if (existing && supabase) {
      supabase.removeChannel(existing);
      this.channels.delete(rideId);
    }
  }
}

export const trackingService = new TrackingService();
export default trackingService;



