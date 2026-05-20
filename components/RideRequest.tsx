import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Coordinates } from '../types';

export interface ActiveRideRequestState {
  id: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'completed';
  estimatedPrice?: number;
  driver?: {
    id: string;
    name: string;
    phone?: string;
    carModel?: string;
    rating?: number;
    estimatedArrival?: number;
  } | null;
}

interface RideRequestProps {
  userLocation: Coordinates;
  onRequestRide: (request: RideRequestData) => void;
  activeRequest?: ActiveRideRequestState | null;
  onCancelRequest?: (requestId: string) => void;
}

export interface RideRequestData {
  pickupLocation: Coordinates;
  pickupAddress: string;
  dropoffLocation: Coordinates;
  dropoffAddress: string;
  passengerName: string;
  passengerPhone: string;
  requestTime: Date;
  estimatedPrice?: number;
}

interface NearbyDriver {
  id: string;
  name: string;
  phone: string;
  location: Coordinates;
  distance: number;
  rating: number;
  carModel: string;
  isAvailable: boolean;
}

const RideRequest: React.FC<RideRequestProps> = ({ userLocation, onRequestRide, activeRequest = null, onCancelRequest }) => {
  const [step, setStep] = useState<'request' | 'searching' | 'matched'>('request');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [matchedDriver, setMatchedDriver] = useState<NearbyDriver | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<number>(0);

  useEffect(() => {
    if (!activeRequest) {
      setStep('request');
      setMatchedDriver(null);
      setEstimatedArrival(0);
      return;
    }
    if (activeRequest.status === 'pending') {
      setStep('searching');
      setMatchedDriver(null);
      return;
    }
    if (activeRequest.status === 'accepted' && activeRequest.driver) {
      setMatchedDriver({
        id: activeRequest.driver.id,
        name: activeRequest.driver.name,
        phone: activeRequest.driver.phone || '',
        location: userLocation,
        distance: 0,
        rating: activeRequest.driver.rating || 4.8,
        carModel: activeRequest.driver.carModel || 'Vehicule',
        isAvailable: true
      });
      setEstimatedArrival(activeRequest.driver.estimatedArrival || 0);
      setStep('matched');
      return;
    }
    if (activeRequest.status === 'cancelled' || activeRequest.status === 'completed') {
      setStep('request');
      setMatchedDriver(null);
      setEstimatedArrival(0);
    }
  }, [activeRequest, userLocation]);

  const handleRequestRide = () => {
    if (!pickupAddress || !dropoffAddress || !passengerName || !passengerPhone) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    onRequestRide({ pickupLocation: userLocation, pickupAddress, dropoffLocation: userLocation, dropoffAddress, passengerName, passengerPhone, requestTime: new Date() });
    setStep('searching');
  };

  const renderRequestForm = () => (
    <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🚖 Demander une course</h2>
        <p className="text-gray-600">Un chauffeur proche viendra vous chercher</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">📍 Point de depart</label>
        <input type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Votre position actuelle" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">🎯 Destination</label>
        <input type="text" value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} placeholder="Ou allez-vous?" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">👤 Nom</label>
        <input type="text" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="Votre nom" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">📱 Telephone / WhatsApp</label>
        <input type="tel" value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} placeholder="221771234567" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 outline-none" />
      </div>
      <button onClick={handleRequestRide} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg transition-all">
        🚗 Trouver un chauffeur
      </button>
    </div>
  );

  const renderSearching = () => (
    <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 relative">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">🔍 Recherche en cours...</h3>
      <p className="text-gray-600 mb-6">Votre demande a ete envoyee aux chauffeurs disponibles a proximite.</p>
      <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Demande en attente</p>
            <p className="text-xs text-gray-500">Depart: {pickupAddress || '—'} • Arrivee: {dropoffAddress || '—'}</p>
          </div>
          {activeRequest?.estimatedPrice ? (
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-700">{activeRequest.estimatedPrice.toLocaleString('fr-FR')} F</div>
              <div className="text-xs text-gray-500">Estimation</div>
            </div>
          ) : null}
        </div>
        <p className="text-sm text-gray-600">Des qu'un chauffeur accepte, vous verrez son nom et son vehicule ici.</p>
      </div>
    </div>
  );

  const renderMatched = () => (
    <div className="bg-white rounded-3xl shadow-xl p-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icons.CheckCircle size={48} className="text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 Chauffeur trouve!</h3>
        <p className="text-gray-600">Votre chauffeur arrive dans <span className="font-bold text-emerald-600">{estimatedArrival} min</span></p>
      </div>
      {matchedDriver && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-emerald-200 rounded-full flex items-center justify-center">
              <Icons.User size={32} className="text-emerald-700" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900">{matchedDriver.name}</h4>
              <p className="text-gray-600">{matchedDriver.carModel}</p>
              <div className="flex items-center gap-1 mt-1">
                <Icons.Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="font-semibold text-gray-900">{matchedDriver.rating}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 bg-white rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Arrivee estimee</span>
              <span className="font-semibold text-emerald-600">{estimatedArrival} min</span>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        <a href={`tel:${matchedDriver?.phone}`} className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl transition-all">
          <Icons.Phone size={20} />
          Appeler le chauffeur
        </a>
        <a href={`https://wa.me/${matchedDriver?.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${matchedDriver?.name}! Je suis ${passengerName}. Je vous attends au ${pickupAddress}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] hover:bg-[#1fbe59] text-white font-semibold rounded-xl transition-all">
          WhatsApp
        </a>
        <button onClick={() => { if (activeRequest?.id && onCancelRequest) onCancelRequest(activeRequest.id); setStep('request'); setMatchedDriver(null); }} className="w-full py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all">
          Annuler la course
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[500px]">
      {step === 'request' && renderRequestForm()}
      {step === 'searching' && renderSearching()}
      {step === 'matched' && renderMatched()}
    </div>
  );
};

export default RideRequest;
