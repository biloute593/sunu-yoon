// Service de géolocalisation en temps réel - OPTIMISÉ POUR VITESSE ET PRÉCISION

import { Coordinates } from '../types';

export interface LocationUpdate {
  rideId: string;
  driverId: string;
  coords: Coordinates;
  speed?: number; // km/h
  heading?: number; // direction en degrés
  timestamp: Date;
  accuracy?: number; // précision en mètres
}

export interface LocationServiceCallbacks {
  onLocationUpdate?: (location: LocationUpdate) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'searching' | 'found' | 'error') => void;
}

export interface GeoLocationResult {
  coords: Coordinates;
  accuracy: number;
  address?: string;
  city?: string;
  timestamp: Date;
}

// Cache pour éviter les appels API répétés
interface LocationCache {
  coords: Coordinates;
  address: string;
  city: string;
  timestamp: number;
}

class LocationService {
  private watchId: number | null = null;
  private isTracking: boolean = false;
  private currentRideId: string | null = null;
  private callbacks: LocationServiceCallbacks = {};
  private lastPosition: GeolocationPosition | null = null;
  private locationCache: LocationCache | null = null;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Villes principales du Sénégal avec coordonnées
  private senegalCities: { [key: string]: Coordinates } = {
    'Dakar': { lat: 14.6928, lng: -17.4467 },
    'Thiès': { lat: 14.7886, lng: -16.9260 },
    'Saint-Louis': { lat: 16.0179, lng: -16.4896 },
    'Touba': { lat: 14.8500, lng: -15.8833 },
    'Kaolack': { lat: 14.1652, lng: -16.0726 },
    'Ziguinchor': { lat: 12.5681, lng: -16.2719 },
    'Rufisque': { lat: 14.7158, lng: -17.2736 },
    'Mbour': { lat: 14.4167, lng: -16.9667 },
    'Diourbel': { lat: 14.6500, lng: -16.2333 },
    'Tambacounda': { lat: 13.7689, lng: -13.6672 },
    'Kolda': { lat: 12.8944, lng: -14.9500 },
    'Fatick': { lat: 14.3333, lng: -16.4167 },
    'Louga': { lat: 15.6167, lng: -16.2167 },
    'Matam': { lat: 15.6500, lng: -13.2500 },
    'Kédougou': { lat: 12.5556, lng: -12.1744 },
    'Sédhiou': { lat: 12.7081, lng: -15.5567 },
    'Pikine': { lat: 14.7500, lng: -17.4000 },
    'Guédiawaye': { lat: 14.7667, lng: -17.3833 },
    'Saly': { lat: 14.4500, lng: -17.0167 },
    'Somone': { lat: 14.4833, lng: -17.0833 }
  };

  /**
   * Vérifie si la géolocalisation est supportée
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Vérifie le cache de localisation
   */
  private getCachedLocation(): LocationCache | null {
    if (this.locationCache && (Date.now() - this.locationCache.timestamp) < this.CACHE_DURATION) {
      return this.locationCache;
    }
    return null;
  }

  /**
   * Stratégie de géolocalisation multi-niveau pour une réponse RAPIDE
   * Niveau 1: Cache local (instantané)
   * Niveau 2: Position IP approximative (< 1s)
   * Niveau 3: GPS basse précision (< 3s)
   * Niveau 4: GPS haute précision (amélioration en arrière-plan)
   */
  async getCurrentPositionFast(callbacks?: LocationServiceCallbacks): Promise<GeoLocationResult> {
    callbacks?.onStatusChange?.('searching');

    // Niveau 1: Vérifier le cache
    const cached = this.getCachedLocation();
    if (cached) {
      callbacks?.onStatusChange?.('found');
      return {
        coords: cached.coords,
        accuracy: 100,
        address: cached.address,
        city: cached.city,
        timestamp: new Date(cached.timestamp)
      };
    }

    // Niveau 2: Essayer la géolocalisation rapide (basse précision)
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        callbacks?.onStatusChange?.('error');
        reject(new Error("La géolocalisation n'est pas supportée par ce navigateur"));
        return;
      }

      let resolved = false;

      // Timeout court pour la première réponse
      const quickTimeout = setTimeout(() => {
        if (!resolved) {
          // Utiliser Dakar comme position par défaut si aucune réponse rapide
          resolved = true;
          const defaultCoords = this.senegalCities['Dakar'];
          callbacks?.onStatusChange?.('found');
          resolve({
            coords: defaultCoords,
            accuracy: 50000,
            address: 'Dakar, Sénégal',
            city: 'Dakar',
            timestamp: new Date()
          });
        }
      }, 5000);

      // GPS basse précision (rapide)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(quickTimeout);
            
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            // Trouver la ville la plus proche
            const nearestCity = this.findNearestCity(coords);
            
            // Mettre en cache
            this.locationCache = {
              coords,
              address: nearestCity ? `${nearestCity}, Sénégal` : 'Ma position',
              city: nearestCity || 'Sénégal',
              timestamp: Date.now()
            };

            this.lastPosition = position;
            callbacks?.onStatusChange?.('found');
            
            resolve({
              coords,
              accuracy: position.coords.accuracy,
              address: this.locationCache.address,
              city: this.locationCache.city,
              timestamp: new Date()
            });

            // Améliorer la précision en arrière-plan
            this.improveAccuracyInBackground(callbacks);
          }
        },
        (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(quickTimeout);
            
            // Fallback: Dakar
            const defaultCoords = this.senegalCities['Dakar'];
            callbacks?.onStatusChange?.('found');
            
            resolve({
              coords: defaultCoords,
              accuracy: 50000,
              address: 'Dakar, Sénégal (position approximative)',
              city: 'Dakar',
              timestamp: new Date()
            });
          }
        },
        { 
          enableHighAccuracy: false, 
          timeout: 4000, 
          maximumAge: 300000 // Accepter une position de moins de 5 minutes
        }
      );
    });
  }

  /**
   * Améliore la précision GPS en arrière-plan (silencieux)
   */
  private improveAccuracyInBackground(callbacks?: LocationServiceCallbacks): void {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        const nearestCity = this.findNearestCity(coords);
        
        // Mettre à jour le cache avec la position précise
        this.locationCache = {
          coords,
          address: nearestCity ? `${nearestCity}, Sénégal` : 'Ma position',
          city: nearestCity || 'Sénégal',
          timestamp: Date.now()
        };
        
        this.lastPosition = position;
        
        // Notifier si callback fourni
        if (callbacks?.onLocationUpdate) {
          callbacks.onLocationUpdate({
            rideId: '',
            driverId: '',
            coords,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          });
        }
      },
      () => {}, // Ignorer les erreurs en mode silencieux
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  }

  /**
   * Trouve la ville sénégalaise la plus proche
   */
  findNearestCity(coords: Coordinates): string | null {
    let nearestCity: string | null = null;
    let minDistance = Infinity;
    
    for (const [city, cityCoords] of Object.entries(this.senegalCities)) {
      const distance = this.calculateDistance(coords, cityCoords);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    }
    
    // Retourner la ville si elle est à moins de 100km
    return minDistance < 100 ? nearestCity : null;
  }

  /**
   * Obtient les coordonnées d'une ville
   */
  getCityCoordinates(cityName: string): Coordinates | null {
    const normalizedName = cityName.toLowerCase().trim();
    for (const [city, coords] of Object.entries(this.senegalCities)) {
      if (city.toLowerCase() === normalizedName || 
          normalizedName.includes(city.toLowerCase()) ||
          city.toLowerCase().includes(normalizedName)) {
        return coords;
      }
    }
    return null;
  }

  /**
   * Obtenir la position actuelle (méthode classique)
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
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
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

    // Démarrer watchPosition pour le suivi continu
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

    this.isTracking = false;
    this.currentRideId = null;
    this.callbacks = {};
    console.log('📍 Tracking arrêté');
  }

  /**
   * S'abonner aux mises à jour de position d'un conducteur (pour les passagers)
   */
  subscribeToDriverLocation(rideId: string, callback: (location: LocationUpdate) => void): () => void {
    // Simuler les mises à jour pour le moment (sera connecté au WebSocket plus tard)
    const handleUpdate = (data: LocationUpdate) => {
      if (data.rideId === rideId) {
        callback(data);
      }
    };

    // Retourner la fonction de désabonnement
    return () => {
      console.log('Unsubscribed from driver location');
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
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    
    const update: LocationUpdate = {
      rideId: this.currentRideId!,
      driverId: '', // Sera défini par le serveur
      coords,
      speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // m/s -> km/h
      heading: position.coords.heading ?? undefined,
      accuracy: position.coords.accuracy,
      timestamp: new Date()
    };

    // Callback local
    this.callbacks.onLocationUpdate?.(update);
    this.lastPosition = position;
    
    // Mettre à jour le cache
    const nearestCity = this.findNearestCity(coords);
    this.locationCache = {
      coords,
      address: nearestCity ? `${nearestCity}, Sénégal` : 'Ma position',
      city: nearestCity || 'Sénégal',
      timestamp: Date.now()
    };
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

  get cachedCity(): string | null {
    return this.locationCache?.city || null;
  }

  get cachedAddress(): string | null {
    return this.locationCache?.address || null;
  }
}

export const locationService = new LocationService();
export default locationService;
