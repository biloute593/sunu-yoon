// Service de géolocalisation en temps réel

import { Coordinates } from '../types';
import { socketService } from './messageService';

export interface LocationUpdate {
  rideId: string;
  driverId: string;
  coords: Coordinates;
  speed?: number; // km/h
  heading?: number; // direction en degrés
  timestamp: Date;
}

export interface LocationServiceCallbacks {
  onLocationUpdate?: (location: LocationUpdate) => void;
  onError?: (error: string) => void;
}

class LocationService {
  private watchId: number | null = null;
  private isTracking: boolean = false;
  private currentRideId: string | null = null;
  private callbacks: LocationServiceCallbacks = {};
  private lastPosition: GeolocationPosition | null = null;

  // Options de haute précision pour le GPS
  private geoOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0 // Toujours obtenir une position fraîche
  };

  /**
   * Vérifie si la géolocalisation est supportée
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Obtenir la position actuelle (une seule fois)
   */
  getCurrentPosition(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error("La géolocalisation n'est pas supportée par ce navigateur"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.lastPosition = position;
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(this.formatGeolocationError(error));
        },
        this.geoOptions
      );
    });
  }

  /**
   * Démarrer le suivi en temps réel de la position
   * Utilisé par les conducteurs pendant un trajet
   */
  startTracking(rideId: string, callbacks: LocationServiceCallbacks): boolean {
    if (!this.isSupported()) {
      callbacks.onError?.("La géolocalisation n'est pas supportée");
      return false;
    }

    if (this.isTracking) {
      console.log('Tracking déjà actif');
      return true;
    }

    this.currentRideId = rideId;
    this.callbacks = callbacks;
    this.isTracking = true;

    // Rejoindre le room de tracking via WebSocket
    socketService.emit('tracking:join', { rideId });

    // Démarrer watchPosition pour le suivi continu
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      this.geoOptions
    );

    console.log(`📍 Tracking démarré pour le trajet ${rideId}`);
    return true;
  }

  /**
   * Arrêter le suivi de position
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.currentRideId) {
      socketService.emit('tracking:leave', { rideId: this.currentRideId });
    }

    this.isTracking = false;
    this.currentRideId = null;
    this.callbacks = {};
    console.log('📍 Tracking arrêté');
  }

  /**
   * S'abonner aux mises à jour de position d'un conducteur (pour les passagers)
   */
  subscribeToDriverLocation(rideId: string, callback: (location: LocationUpdate) => void): () => void {
    socketService.emit('tracking:subscribe', { rideId });

    const handleUpdate = (data: LocationUpdate) => {
      if (data.rideId === rideId) {
        callback(data);
      }
    };

    socketService.on('tracking:update', handleUpdate);

    // Retourner la fonction de désabonnement
    return () => {
      socketService.emit('tracking:unsubscribe', { rideId });
      socketService.off('tracking:update', handleUpdate);
    };
  }

  /**
   * Calculer la distance entre deux points (formule Haversine)
   */
  calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(to.lat - from.lat);
    const dLng = this.toRad(to.lng - from.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.lat)) * Math.cos(this.toRad(to.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Estimer le temps d'arrivée
   */
  estimateArrival(distance: number, speedKmh: number = 50): number {
    if (speedKmh <= 0) speedKmh = 50; // Vitesse par défaut
    return Math.round((distance / speedKmh) * 60); // En minutes
  }

  private handlePositionUpdate(position: GeolocationPosition): void {
    const update: LocationUpdate = {
      rideId: this.currentRideId!,
      driverId: '', // Sera défini par le serveur
      coords: {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      },
      speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // m/s -> km/h
      heading: position.coords.heading ?? undefined,
      timestamp: new Date()
    };

    // Envoyer au serveur via WebSocket
    socketService.emit('tracking:update', update);

    // Callback local
    this.callbacks.onLocationUpdate?.(update);
    this.lastPosition = position;
  }

  private handlePositionError(error: GeolocationPositionError): void {
    const errorMsg = this.formatGeolocationError(error);
    this.callbacks.onError?.(errorMsg);
  }

  private formatGeolocationError(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Accès à la localisation refusé. Veuillez autoriser l'accès dans les paramètres.";
      case error.POSITION_UNAVAILABLE:
        return "Position indisponible. Vérifiez que le GPS est activé.";
      case error.TIMEOUT:
        return "Délai d'attente dépassé pour obtenir la position.";
      default:
        return "Erreur de géolocalisation inconnue.";
    }
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Getters
  get tracking(): boolean {
    return this.isTracking;
  }

  get lastCoords(): Coordinates | null {
    if (!this.lastPosition) return null;
    return {
      lat: this.lastPosition.coords.latitude,
      lng: this.lastPosition.coords.longitude
    };
  }
}

export const locationService = new LocationService();
export default locationService;
