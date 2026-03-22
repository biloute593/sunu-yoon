import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Coordinates } from '../types';
import { LocationUpdate } from '../services/locationService';

// Correction de l'icône par défaut de Leaflet sous React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icône personnalisée pour le chauffeur (voiture)
const carIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icône pour l'utilisateur
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Composant pour recentrer la carte automatiquement
const RecenterAutomatically = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

interface LiveMapProps {
  userLocation?: Coordinates;
  driverLocation?: LocationUpdate | null;
  isTracking?: boolean;
  height?: string;
  showRoute?: boolean;
}

const LiveMap: React.FC<LiveMapProps> = ({ 
  userLocation, 
  driverLocation, 
  isTracking = false,
  height = '400px'
}) => {
  // Centre par défaut (Dakar si pas de position locale)
  const defaultCenter: [number, number] = [14.6928, -17.4467];
  
  const center: [number, number] = driverLocation 
    ? [driverLocation.coords.lat, driverLocation.coords.lng] 
    : userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : defaultCenter;

  return (
    <div style={{ height, width: '100%', borderRadius: '16px', overflow: 'hidden' }} className="shadow-inner border border-gray-200">
      <MapContainer 
        center={center} 
        zoom={driverLocation ? 16 : 13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Recentre la map quand le chauffeur bouge */}
        {driverLocation && (
          <RecenterAutomatically lat={driverLocation.coords.lat} lng={driverLocation.coords.lng} />
        )}

        {/* Marqueur du Passager (Bleu) */}
        {userLocation && !isTracking && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>Votre position</Popup>
          </Marker>
        )}

        {/* Marqueur du Chauffeur (Vert) */}
        {driverLocation && (
          <Marker position={[driverLocation.coords.lat, driverLocation.coords.lng]} icon={carIcon}>
            <Popup>
              <div className="text-center font-semibold">
                🚖 Chauffeur en ligne <br/>
                {driverLocation.speed ? `Vitesse: ${Math.round(driverLocation.speed * 3.6)} km/h` : ''}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
