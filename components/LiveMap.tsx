import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Coordinates } from '../types';
import { LocationUpdate } from '../services/locationService';

interface LiveMapProps {
  // Position initiale (centre de la carte)
  initialCenter?: Coordinates;
  // Position de l'utilisateur
  userLocation?: Coordinates | null;
  // Position du conducteur (pour les passagers)
  driverLocation?: LocationUpdate | null;
  // Points de départ et d'arrivée du trajet
  origin?: Coordinates | null;
  destination?: Coordinates | null;
  // Afficher l'itinéraire
  showRoute?: boolean;
  // Hauteur de la carte
  height?: string;
  // Mode tracking actif (conducteur)
  isTracking?: boolean;
  // Callback quand l'utilisateur clique sur la carte
  onMapClick?: (coords: Coordinates) => void;
}

declare global {
  interface Window {
    L: any;
  }
}

const LiveMap: React.FC<LiveMapProps> = ({
  initialCenter,
  userLocation,
  driverLocation,
  origin,
  destination,
  showRoute = false,
  height = "400px",
  isTracking = false,
  onMapClick
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);

  // Centre par défaut: Dakar, Sénégal
  const defaultCenter: Coordinates = { lat: 14.6928, lng: -17.4467 };

  // Icônes personnalisées
  const createIcon = useCallback((color: string, size: number = 16, pulse: boolean = false) => {
    if (!window.L) return null;
    
    const pulseAnimation = pulse ? `
      <style>
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      </style>
      <div style="
        position: absolute;
        width: ${size * 2}px;
        height: ${size * 2}px;
        background: ${color};
        border-radius: 50%;
        animation: pulse-ring 1.5s ease-out infinite;
        opacity: 0.3;
        top: -${size / 2}px;
        left: -${size / 2}px;
      "></div>
    ` : '';

    return window.L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="position: relative;">
          ${pulseAnimation}
          <div style="
            background-color: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [size + 6, size + 6],
      iconAnchor: [(size + 6) / 2, (size + 6) / 2]
    });
  }, []);

  // Icône véhicule pour le conducteur
  const createCarIcon = useCallback((heading?: number) => {
    if (!window.L) return null;
    
    const rotation = heading || 0;
    
    return window.L.divIcon({
      className: 'car-marker',
      html: `
        <div style="
          transform: rotate(${rotation}deg);
          transition: transform 0.3s ease;
        ">
          <div style="
            background: linear-gradient(135deg, #10b981, #059669);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            border: 3px solid white;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [46, 46],
      iconAnchor: [23, 23]
    });
  }, []);

  // Initialisation de la carte
  useEffect(() => {
    if (!containerRef.current || !window.L || mapRef.current) return;

    const center = initialCenter || userLocation || defaultCenter;

    mapRef.current = window.L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomControl: true
    });

    // Layer OpenStreetMap
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapRef.current);

    // Gestionnaire de clic
    if (onMapClick) {
      mapRef.current.on('click', (e: any) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Mise à jour position utilisateur
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;

    const icon = createIcon('#3b82f6', 14, false); // Bleu pour l'utilisateur
    if (!icon) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { icon })
        .addTo(mapRef.current)
        .bindPopup('Vous êtes ici');
    }
  }, [userLocation, mapReady, createIcon]);

  // Mise à jour position conducteur (temps réel)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !driverLocation) return;

    const icon = createCarIcon(driverLocation.heading);
    if (!icon) return;

    if (driverMarkerRef.current) {
      // Animation fluide vers la nouvelle position
      driverMarkerRef.current.setLatLng([driverLocation.coords.lat, driverLocation.coords.lng]);
      driverMarkerRef.current.setIcon(icon);
    } else {
      driverMarkerRef.current = window.L.marker(
        [driverLocation.coords.lat, driverLocation.coords.lng],
        { icon }
      ).addTo(mapRef.current);

      // Popup avec infos en temps réel
      const speed = driverLocation.speed ? `${Math.round(driverLocation.speed)} km/h` : 'N/A';
      driverMarkerRef.current.bindPopup(`
        <div style="text-align: center; font-family: sans-serif;">
          <strong>🚗 Conducteur</strong><br/>
          <span style="color: #6b7280;">Vitesse: ${speed}</span>
        </div>
      `);
    }

    // Centrer sur le conducteur si on suit le trajet
    if (isTracking) {
      mapRef.current.panTo([driverLocation.coords.lat, driverLocation.coords.lng], {
        animate: true,
        duration: 0.5
      });
    }
  }, [driverLocation, mapReady, isTracking, createCarIcon]);

  // Marqueurs origine/destination
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Origine (vert)
    if (origin) {
      const originIcon = createIcon('#22c55e', 12);
      if (originIcon) {
        if (originMarkerRef.current) {
          originMarkerRef.current.setLatLng([origin.lat, origin.lng]);
        } else {
          originMarkerRef.current = window.L.marker([origin.lat, origin.lng], { icon: originIcon })
            .addTo(mapRef.current)
            .bindPopup('Point de départ');
        }
      }
    }

    // Destination (rouge)
    if (destination) {
      const destIcon = createIcon('#ef4444', 12);
      if (destIcon) {
        if (destMarkerRef.current) {
          destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
        } else {
          destMarkerRef.current = window.L.marker([destination.lat, destination.lng], { icon: destIcon })
            .addTo(mapRef.current)
            .bindPopup('Destination');
        }
      }
    }

    // Ajuster la vue pour voir tous les points
    if (origin && destination) {
      const bounds = window.L.latLngBounds([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ]);
      if (userLocation) {
        bounds.extend([userLocation.lat, userLocation.lng]);
      }
      if (driverLocation) {
        bounds.extend([driverLocation.coords.lat, driverLocation.coords.lng]);
      }
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [origin, destination, mapReady, createIcon, userLocation, driverLocation]);

  // Tracer la route
  useEffect(() => {
    if (!mapReady || !mapRef.current || !showRoute || !origin || !destination) return;

    // Supprimer l'ancienne route
    if (routeLineRef.current) {
      mapRef.current.removeLayer(routeLineRef.current);
    }

    // Tracer une ligne simple entre origine et destination
    // Pour une vraie route, il faudrait utiliser OSRM ou une API de routing
    const latlngs = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng]
    ];

    routeLineRef.current = window.L.polyline(latlngs, {
      color: '#10b981',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(mapRef.current);
  }, [origin, destination, showRoute, mapReady]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200">
      <div ref={containerRef} style={{ height, width: '100%', zIndex: 0 }} />
      
      {/* Indicateur de tracking actif */}
      {isTracking && (
        <div className="absolute top-3 left-3 z-[1000] bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          GPS Actif
        </div>
      )}

      {/* Légende */}
      {(origin || destination || driverLocation) && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs">
          <div className="space-y-1.5">
            {origin && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Départ</span>
              </div>
            )}
            {destination && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span>Arrivée</span>
              </div>
            )}
            {driverLocation && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                <span>Conducteur</span>
              </div>
            )}
            {userLocation && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>Vous</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informations vitesse/ETA */}
      {driverLocation?.speed && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {Math.round(driverLocation.speed)}
          </div>
          <div className="text-xs text-gray-500">km/h</div>
        </div>
      )}
    </div>
  );
};

export default LiveMap;
