import React, { useState } from 'react';
import { Icons } from './Icons';
import { Coordinates } from '../types';

export interface DriverRideRequest {
  id: string;
  passengerName: string;
  passengerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLocation: Coordinates;
  distance: number;
  estimatedPrice: number;
  requestTime: Date;
  status: 'pending' | 'accepted' | 'cancelled' | 'completed';
}

interface DriverDashboardProps {
  driverLocation: Coordinates;
  isAvailable: boolean;
  onToggleAvailability: () => void;
  onAcceptRide: (requestId: string, estimatedArrival: number) => void;
  onRejectRide?: (requestId: string) => void;
  onCompleteRide?: (requestId: string) => void;
  pendingRequests?: DriverRideRequest[];
  activeRequest?: DriverRideRequest | null;
  driverProfile?: { name: string; phone?: string; carModel?: string } | null;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({
  driverLocation: _driverLocation,
  isAvailable,
  onToggleAvailability,
  onAcceptRide,
  onRejectRide,
  onCompleteRide,
  pendingRequests = [],
  activeRequest = null,
  driverProfile
}) => {
  const [estimatedArrival, setEstimatedArrival] = useState<number>(10);

  const handleAcceptRide = (request: DriverRideRequest) => {
    const arrival = Math.ceil(request.distance * 3);
    setEstimatedArrival(arrival);
    onAcceptRide(request.id, arrival);
  };

  return (
    <div className="space-y-6">
      {/* Availability toggle */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {isAvailable ? '🟢 Vous etes disponible' : '🔴 Hors ligne'}
            </h3>
            <p className="text-sm text-gray-600">
              {isAvailable ? 'Les clients peuvent voir votre position' : 'Activez pour recevoir des courses'}
            </p>
            {driverProfile && (
              <p className="text-xs text-gray-400 mt-1">{driverProfile.name} • {driverProfile.carModel || 'Vehicule'}</p>
            )}
          </div>
          <button
            onClick={onToggleAvailability}
            className={`px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
              isAvailable ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isAvailable ? 'Se deconnecter' : 'Se connecter'}
          </button>
        </div>
      </div>

      {!isAvailable && (
        <div className="bg-gray-100 rounded-2xl p-6 text-center">
          <Icons.AlertCircle size={48} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Activez votre disponibilite pour recevoir des courses</p>
        </div>
      )}

      {/* Accepted ride in progress */}
      {isAvailable && activeRequest && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-xl border-2 border-emerald-300 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Icons.Navigation size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">🚗 Course en cours</h3>
            <p className="text-gray-600">Arrivee prevue dans <span className="font-bold text-emerald-600">{estimatedArrival} min</span></p>
          </div>
          <div className="bg-white rounded-xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Icons.User size={24} className="text-emerald-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{activeRequest.passengerName}</h4>
                <p className="text-sm text-gray-600">{activeRequest.passengerPhone}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Depart</p>
                  <p className="font-semibold text-gray-900">{activeRequest.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Arrivee</p>
                  <p className="font-semibold text-gray-900">{activeRequest.dropoffAddress}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
              <span className="text-gray-600">Prix estime</span>
              <span className="font-bold text-emerald-600 text-lg">{activeRequest.estimatedPrice.toLocaleString('fr-FR')} F</span>
            </div>
          </div>
          <div className="space-y-3">
            <a href={`tel:${activeRequest.passengerPhone}`} className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-xl border-2 border-gray-200 transition-all">
              <Icons.Phone size={20} />
              Appeler le client
            </a>
            <a href={`https://wa.me/${activeRequest.passengerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${activeRequest.passengerName}! Je suis votre chauffeur. J'arrive dans ${estimatedArrival} minutes.`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] hover:bg-[#1fbe59] text-white font-semibold rounded-xl transition-all">
              WhatsApp
            </a>
            <button onClick={() => onCompleteRide?.(activeRequest.id)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all transform hover:scale-105">
              ✓ Terminer la course
            </button>
          </div>
        </div>
      )}

      {/* Pending requests */}
      {isAvailable && !activeRequest && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📍 Demandes de courses ({pendingRequests.length})
          </h3>
          {pendingRequests.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <Icons.Clock size={48} className="text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">En attente de nouvelles courses...</p>
              <p className="text-sm text-gray-400 mt-2">Les demandes apparaissent ici en temps reel</p>
            </div>
          ) : (
            pendingRequests.map(request => (
              <div key={request.id} className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 p-6 animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{request.passengerName}</h4>
                    <p className="text-sm text-gray-600">{request.distance} km de vous</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{request.estimatedPrice.toLocaleString('fr-FR')} F</p>
                    <p className="text-xs text-gray-500">Estimation</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Depart</p>
                      <p className="font-semibold text-gray-900">{request.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Arrivee</p>
                      <p className="font-semibold text-gray-900">{request.dropoffAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onRejectRide?.(request.id)} className="flex-1 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all">
                    Refuser
                  </button>
                  <button onClick={() => handleAcceptRide(request)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all transform hover:scale-105">
                    Accepter ✓
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
