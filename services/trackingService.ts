import { Coordinates } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface TrackingUpdate {
  rideId: string;
  coords: Coordinates;
  speed?: number;
  heading?: number;
  updatedAt: string;
  ended?: boolean;
  reason?: string;
}

type UpdateCallback = (update: TrackingUpdate) => void;
type ErrorCallback = (message: string) => void;

class TrackingService {
  private streams = new Map<string, EventSource>();
  private lastPushByRide = new Map<string, number>();
  private reconnectAttempts = new Map<string, number>();
  private MIN_PUSH_INTERVAL_MS = 1500;
  private MAX_RECONNECT_ATTEMPTS = 5;
  private RECONNECT_DELAY_MS = 3000;

  async publishDriverLocation(rideId: string, payload: {
    coords: Coordinates;
    speed?: number;
    heading?: number;
  }): Promise<void> {
    if (!rideId) return;

    const now = Date.now();
    const lastPush = this.lastPushByRide.get(rideId) || 0;
    if (now - lastPush < this.MIN_PUSH_INTERVAL_MS) {
      return;
    }

    this.lastPushByRide.set(rideId, now);

    try {
      await fetch(`${API_URL}/tracking/${rideId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: payload.coords.lat,
          lng: payload.coords.lng,
          speed: payload.speed,
          heading: payload.heading
        }),
        keepalive: true
      });
    } catch (error) {
      console.warn('Impossible d\'envoyer la position du conducteur', error);
    }
  }

  async stopDriverTracking(rideId: string): Promise<void> {
    if (!rideId) return;
    try {
      await fetch(`${API_URL}/tracking/${rideId}`, { method: 'DELETE' });
    } catch (error) {
      console.warn('Impossible d\'arrêter le tracking côté serveur', error);
    }
  }

  async getLatestLocation(rideId: string): Promise<TrackingUpdate | null> {
    if (!rideId) return null;

    try {
      const response = await fetch(`${API_URL}/tracking/${rideId}`);
      if (!response.ok) {
        return null;
      }
      const body = await response.json();
      return body.data as TrackingUpdate;
    } catch (error) {
      console.warn('Impossible de récupérer la dernière position', error);
      return null;
    }
  }

  subscribeToRide(
    rideId: string,
    onUpdate: UpdateCallback,
    onError?: ErrorCallback
  ): () => void {
    if (!rideId || typeof window === 'undefined' || !('EventSource' in window)) {
      onError?.('Le suivi en direct n\'est pas supporté sur ce navigateur.');
      return () => undefined;
    }

    this.unsubscribeFromRide(rideId);

    const url = `${API_URL}/tracking/${rideId}/stream`;
    const source = new EventSource(url, { withCredentials: false });

    source.onmessage = (event) => {
      try {
        this.reconnectAttempts.set(rideId, 0);
        const data = JSON.parse(event.data) as TrackingUpdate;
        onUpdate(data);
      } catch (error) {
        console.warn('Payload SSE invalide', error);
      }
    };

    source.onerror = (error) => {
      console.error('Erreur SSE pour trajet', rideId, error);
      const attempts = this.reconnectAttempts.get(rideId) || 0;
      
      if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
        onError?.('Impossible de maintenir la connexion après plusieurs tentatives');
        this.unsubscribeFromRide(rideId);
        this.reconnectAttempts.delete(rideId);
        return;
      }
      
      this.reconnectAttempts.set(rideId, attempts + 1);
      const delay = Math.min(this.RECONNECT_DELAY_MS * Math.pow(2, attempts), 30000);
      
      setTimeout(() => {
        if (source.readyState === EventSource.CLOSED) {
          console.log(`Reconnexion SSE tentative ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS}`);
          this.subscribeToRide(rideId, onUpdate, onError);
        }
      }, delay);
    };

    source.onopen = () => {
      console.log('Stream SSE ouvert pour', rideId);
      this.reconnectAttempts.set(rideId, 0);
    };

    const timeoutId = setTimeout(() => {
      if (source.readyState === EventSource.CONNECTING) {
        console.warn('Timeout de connexion SSE');
        source.close();
        onError?.('Délai de connexion dépassé');
      }
    }, 10000);

    source.addEventListener('open', () => clearTimeout(timeoutId));

    this.streams.set(rideId, source);

    return () => {
      source.close();
      this.streams.delete(rideId);
    };
  }

  unsubscribeFromRide(rideId: string) {
    const existing = this.streams.get(rideId);
    if (existing) {
      existing.close();
      this.streams.delete(rideId);
    }
  }
}

export const trackingService = new TrackingService();
export default trackingService;
