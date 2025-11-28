import React, { useEffect, useRef } from 'react';
import { Coordinates } from '../types';

interface MapProps {
  location: Coordinates | null;
  height?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

const Map: React.FC<MapProps> = ({ location, height = "300px" }) => {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default center (Dakar, Senegal)
  const defaultCenter = [14.6928, -17.4467];

  useEffect(() => {
    if (!containerRef.current || !window.L) return;

    if (!mapRef.current) {
      // Initialize map
      mapRef.current = window.L.map(containerRef.current).setView(
        location ? [location.lat, location.lng] : defaultCenter, 
        13
      );

      // Add OpenStreetMap tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
      
      // Add custom icon style for user position
      const userIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (location) {
        markerRef.current = window.L.marker([location.lat, location.lng], { icon: userIcon })
          .addTo(mapRef.current)
          .bindPopup("Vous êtes ici")
          .openPopup();
      }
    } else {
      // Update view if map already exists
      if (location) {
        mapRef.current.setView([location.lat, location.lng], 15);
        
        if (markerRef.current) {
          markerRef.current.setLatLng([location.lat, location.lng]);
        } else {
           const userIcon = window.L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3);"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          markerRef.current = window.L.marker([location.lat, location.lng], { icon: userIcon })
            .addTo(mapRef.current)
            .bindPopup("Vous êtes ici")
            .openPopup();
        }
      }
    }

    return () => {
       // Cleanup logic if needed, but for simple SPA usually we keep the map instance
       // mapRef.current?.remove();
    };
  }, [location]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-md border border-gray-200">
       <div ref={containerRef} style={{ height, width: '100%', zIndex: 0 }} />
       {!location && (
         <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 pointer-events-none z-[1000]">
           <span className="text-gray-500 font-medium bg-white px-3 py-1 rounded-full shadow-sm">
             En attente de localisation...
           </span>
         </div>
       )}
    </div>
  );
};

export default Map;