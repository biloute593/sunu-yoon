import React, { useEffect, useRef, useState } from 'react';
import { Coordinates } from '../types';

interface DriverMarker {
  id: string;
  coords: Coordinates;
  name: string;
  destination: string;
}

interface MapProps {
  location: Coordinates | null;
  height?: string;
  showDrivers?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

const Map: React.FC<MapProps> = ({ location, height = "300px", showDrivers = true }) => {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const driverMarkersRef = useRef<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Default center (Dakar, Senegal)
  const defaultCenter: [number, number] = [14.6928, -17.4467];

  // Simuler des conducteurs à proximité
  const generateNearbyDrivers = (center: Coordinates): DriverMarker[] => {
    const destinations = ['Saint-Louis', 'Thiès', 'Touba', 'Mbour', 'Kaolack', 'Ziguinchor'];
    const names = ['Amadou', 'Fatou', 'Moussa', 'Ibrahima', 'Mariama', 'Ousmane'];
    
    return Array.from({ length: 5 }, (_, i) => ({
      id: `driver-${i}`,
      coords: {
        lat: center.lat + (Math.random() - 0.5) * 0.08,
        lng: center.lng + (Math.random() - 0.5) * 0.08
      },
      name: names[i % names.length],
      destination: destinations[i % destinations.length]
    }));
  };

  useEffect(() => {
    // Attendre que Leaflet soit chargé
    const checkLeaflet = setInterval(() => {
      if (window.L) {
        clearInterval(checkLeaflet);
        setIsMapReady(true);
      }
    }, 100);

    return () => clearInterval(checkLeaflet);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isMapReady || !window.L) return;

    const center = location ? [location.lat, location.lng] : defaultCenter;

    if (!mapRef.current) {
      // Initialize map
      mapRef.current = window.L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true
      }).setView(center as [number, number], 13);

      // Add OpenStreetMap tile layer with better styling
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(mapRef.current);
      
      // Add custom CSS for markers
      const style = document.createElement('style');
      style.textContent = `
        .user-marker {
          background: #10b981;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 4px rgba(16, 185, 129, 0.3);
        }
        .driver-marker {
          background: #3b82f6;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        }
        .driver-marker:hover {
          transform: scale(1.2);
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
      `;
      document.head.appendChild(style);
    }

    // Update user marker
    const userIcon = window.L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="user-marker"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (location) {
      mapRef.current.setView([location.lat, location.lng], 14, { animate: true });
      
      if (markerRef.current) {
        markerRef.current.setLatLng([location.lat, location.lng]);
      } else {
        markerRef.current = window.L.marker([location.lat, location.lng], { icon: userIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="text-align: center;">
              <strong style="color: #10b981;">📍 Vous êtes ici</strong>
            </div>
          `);
      }

      // Add driver markers if enabled
      if (showDrivers) {
        // Remove old driver markers
        driverMarkersRef.current.forEach(marker => {
          mapRef.current.removeLayer(marker);
        });
        driverMarkersRef.current = [];

        // Add new driver markers
        const drivers = generateNearbyDrivers(location);
        drivers.forEach(driver => {
          const driverIcon = window.L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="driver-marker"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const marker = window.L.marker([driver.coords.lat, driver.coords.lng], { icon: driverIcon })
            .addTo(mapRef.current)
            .bindPopup(`
              <div style="min-width: 120px;">
                <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">🚗 ${driver.name}</div>
                <div style="font-size: 12px; color: #6b7280;">→ ${driver.destination}</div>
                <button 
                  style="margin-top: 8px; width: 100%; padding: 6px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;"
                  onclick="alert('Voir ce trajet')"
                >
                  Voir le trajet
                </button>
              </div>
            `);

          driverMarkersRef.current.push(marker);
        });
      }
    }

    return () => {
      // Cleanup handled by React's lifecycle
    };
  }, [location, isMapReady, showDrivers]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-200">
      <div ref={containerRef} style={{ height, width: '100%', zIndex: 0 }} />
      {!location && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-100/80 to-gray-200/80 pointer-events-none z-[1000]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-gray-600 font-medium bg-white/90 px-4 py-2 rounded-full shadow-sm text-sm">
              Activez la localisation
            </span>
          </div>
        </div>
      )}
      {location && showDrivers && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md z-[1000] flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-gray-700 font-medium">5 conducteurs à proximité</span>
        </div>
      )}
    </div>
  );
};

export default Map;