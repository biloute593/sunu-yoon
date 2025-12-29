import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Coordinates } from '../types';

interface RideRequest {
  id: string;
  passengerName: string;
  passengerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLocation: Coordinates;
  distance: number; // km depuis position chauffeur
  estimatedPrice: number;
  requestTime: Date;
}

interface DriverDashboardProps {
  driverLocation: Coordinates;
  isAvailable: boolean;
  onToggleAvailability: () => void;
  onAcceptRide: (requestId: string, estimatedArrival: number) => void;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({
  driverLocation,
  isAvailable,
  onToggleAvailability,
  onAcceptRide
}) => {
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [acceptedRequest, setAcceptedRequest] = useState<RideRequest | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<number>(10);

  // Simuler l'arrivée de nouvelles demandes
  useEffect(() => {
    if (isAvailable && !acceptedRequest) {
      const interval = setInterval(() => {
        // Simulation - dans la vraie app, utiliser WebSocket
        const newRequest: RideRequest = {
          id: `REQ${Date.now()}`,
          passengerName: 'Client ' + Math.floor(Math.random() * 100),
          passengerPhone: '221771234567',
          pickupAddress: 'Liberté 6, Dakar',
          dropoffAddress: 'Plateau, Dakar',
          pickupLocation: {
            lat: driverLocation.lat + (Math.random() - 0.5) * 0.05,
            lng: driverLocation.lng + (Math.random() - 0.5) * 0.05
          },
          distance: parseFloat((Math.random() * 5 + 0.5).toFixed(1)),
          estimatedPrice: Math.floor(Math.random() * 3000 + 1000),
          requestTime: new Date()
        };
        
        setPendingRequests(prev => [...prev, newRequest]);
      }, 15000); // Nouvelle demande toutes les 15s

      return () => clearInterval(interval);
    }
  }, [isAvailable, acceptedRequest, driverLocation]);

  const handleAcceptRide = (request: RideRequest) => {
    const arrival = Math.ceil(request.distance * 3); // ~3 min/km
    setEstimatedArrival(arrival);
    setAcceptedRequest(request);
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
    onAcceptRide(request.id, arrival);
  };

  const handleRejectRide = (requestId: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleCompleteRide = () => {
    setAcceptedRequest(null);
    setEstimatedArrival(10);
  };

  const renderAvailabilityToggle = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {isAvailable ? '🟢 Vous êtes disponible' : '🔴 Hors ligne'}
          </h3>
          <p className="text-sm text-gray-600">
            {isAvailable 
              ? 'Les clients peuvent voir votre position' 
              : 'Activez pour recevoir des courses'}
          </p>
        </div>
        <button
          onClick={onToggleAvailability}
          className={`px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
            isAvailable
              ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isAvailable ? 'Se déconnecter' : 'Se connecter'}
        </button>
      </div>
    </div>
  );

  const renderPendingRequests = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        📍 Demandes de courses ({pendingRequests.length})
      </h3>
      
      {pendingRequests.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Icons.Clock size={48} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">En attente de nouvelles courses...</p>
        </div>
      ) : (
        pendingRequests.map(request => (
          <div 
            key={request.id}
            className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 p-6 animate-fade-in"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900">{request.passengerName}</h4>
                <p className="text-sm text-gray-600">{request.distance} km de vous</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">
                  {request.estimatedPrice.toLocaleString('fr-FR')} F
                </p>
                <p className="text-xs text-gray-500">Estimation</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Départ</p>
                  <p className="font-semibold text-gray-900">{request.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Arrivée</p>
                  <p className="font-semibold text-gray-900">{request.dropoffAddress}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleRejectRide(request.id)}
                className="flex-1 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all"
              >
                Refuser
              </button>
              <button
                onClick={() => handleAcceptRide(request)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all transform hover:scale-105"
              >
                Accepter ✓
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderAcceptedRide = () => (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-xl border-2 border-emerald-300 p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
          <Icons.Navigation size={32} className="text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">🚗 Course en cours</h3>
        <p className="text-gray-600">Arrivée prévue dans <span className="font-bold text-emerald-600">{estimatedArrival} min</span></p>
      </div>

      {acceptedRequest && (
        <>
          <div className="bg-white rounded-xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Icons.User size={24} className="text-emerald-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{acceptedRequest.passengerName}</h4>
                <p className="text-sm text-gray-600">{acceptedRequest.passengerPhone}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Départ</p>
                  <p className="font-semibold text-gray-900">{acceptedRequest.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Arrivée</p>
                  <p className="font-semibold text-gray-900">{acceptedRequest.dropoffAddress}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Prix estimé</span>
                <span className="font-bold text-emerald-600 text-lg">
                  {acceptedRequest.estimatedPrice.toLocaleString('fr-FR')} F
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={`tel:${acceptedRequest.passengerPhone}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-xl border-2 border-gray-200 transition-all"
            >
              <Icons.Phone size={20} />
              Appeler le client
            </a>
            
            <a
              href={`https://wa.me/${acceptedRequest.passengerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${acceptedRequest.passengerName}! Je suis votre chauffeur. J'arrive dans ${estimatedArrival} minutes au ${acceptedRequest.pickupAddress}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] hover:bg-[#1fbe59] text-white font-semibold rounded-xl transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </a>

            <button
              onClick={handleCompleteRide}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all transform hover:scale-105"
            >
              ✓ Terminer la course
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {renderAvailabilityToggle()}
      
      {!isAvailable && (
        <div className="bg-gray-100 rounded-2xl p-6 text-center">
          <Icons.AlertCircle size={48} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Activez votre disponibilité pour recevoir des courses</p>
        </div>
      )}

      {isAvailable && !acceptedRequest && renderPendingRequests()}
      {isAvailable && acceptedRequest && renderAcceptedRide()}
    </div>
  );
};

export default DriverDashboard;
