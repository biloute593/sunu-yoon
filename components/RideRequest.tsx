import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Coordinates } from '../types';

interface RideRequestProps {
  userLocation: Coordinates;
  onRequestRide: (request: RideRequestData) => void;
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
  distance: number; // en km
  rating: number;
  carModel: string;
  isAvailable: boolean;
}

const RideRequest: React.FC<RideRequestProps> = ({ userLocation, onRequestRide }) => {
  const [step, setStep] = useState<'request' | 'searching' | 'matched'>('request');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [matchedDriver, setMatchedDriver] = useState<NearbyDriver | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<number>(0); // minutes

  // Simuler la recherche de chauffeurs à proximité
  const searchNearbyDrivers = () => {
    setStep('searching');
    
    // Simulation - dans la vraie app, ceci viendrait du backend
    setTimeout(() => {
      const drivers: NearbyDriver[] = [
        {
          id: '1',
          name: 'Mamadou Diallo',
          phone: '221771234567',
          location: { lat: userLocation.lat + 0.01, lng: userLocation.lng + 0.01 },
          distance: 1.2,
          rating: 4.8,
          carModel: 'Toyota Corolla',
          isAvailable: true
        },
        {
          id: '2',
          name: 'Abdoulaye Sow',
          phone: '221775678901',
          location: { lat: userLocation.lat - 0.02, lng: userLocation.lng + 0.02 },
          distance: 2.5,
          rating: 4.6,
          carModel: 'Hyundai i10',
          isAvailable: true
        }
      ];
      setNearbyDrivers(drivers);
    }, 2000);
  };

  const handleRequestRide = () => {
    if (!pickupAddress || !dropoffAddress || !passengerName || !passengerPhone) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const request: RideRequestData = {
      pickupLocation: userLocation,
      pickupAddress,
      dropoffLocation: userLocation, // À améliorer avec géocodage
      dropoffAddress,
      passengerName,
      passengerPhone,
      requestTime: new Date()
    };

    onRequestRide(request);
    searchNearbyDrivers();
  };

  const renderRequestForm = () => (
    <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🚖 Demander une course</h2>
        <p className="text-gray-600">Un chauffeur proche viendra vous chercher</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">📍 Point de départ</label>
        <input
          type="text"
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          placeholder="Votre position actuelle"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">🎯 Destination</label>
        <input
          type="text"
          value={dropoffAddress}
          onChange={(e) => setDropoffAddress(e.target.value)}
          placeholder="Où allez-vous?"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">👤 Nom</label>
        <input
          type="text"
          value={passengerName}
          onChange={(e) => setPassengerName(e.target.value)}
          placeholder="Votre nom"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">📱 Téléphone / WhatsApp</label>
        <input
          type="tel"
          value={passengerPhone}
          onChange={(e) => setPassengerPhone(e.target.value)}
          placeholder="221771234567"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
        />
      </div>

      <button
        onClick={handleRequestRide}
        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all"
      >
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
      <p className="text-gray-600 mb-6">Nous recherchons les chauffeurs disponibles près de vous</p>
      
      {nearbyDrivers.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-emerald-600">✓ {nearbyDrivers.length} chauffeur(s) trouvé(s)!</p>
          {nearbyDrivers.map(driver => (
            <div 
              key={driver.id}
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{driver.name}</p>
                  <p className="text-sm text-gray-600">{driver.carModel}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Icons.Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">{driver.rating}</span>
                    <span className="text-xs text-gray-500">• {driver.distance} km</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMatchedDriver(driver);
                    setEstimatedArrival(Math.ceil(driver.distance * 3)); // ~3 min/km
                    setStep('matched');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
                >
                  Choisir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMatched = () => (
    <div className="bg-white rounded-3xl shadow-xl p-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icons.CheckCircle size={48} className="text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 Chauffeur trouvé!</h3>
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
              <span className="text-gray-600">Distance</span>
              <span className="font-semibold text-gray-900">{matchedDriver.distance} km</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Arrivée estimée</span>
              <span className="font-semibold text-emerald-600">{estimatedArrival} min</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <a
          href={`tel:${matchedDriver?.phone}`}
          className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl transition-all"
        >
          <Icons.Phone size={20} />
          Appeler le chauffeur
        </a>
        
        <a
          href={`https://wa.me/${matchedDriver?.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${matchedDriver?.name}! Je suis ${passengerName}. Je vous attends au ${pickupAddress}`)}`}
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
          onClick={() => {
            setStep('request');
            setMatchedDriver(null);
          }}
          className="w-full py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all"
        >
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
