import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import CookieBanner from './components/CookieBanner';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import ChatWindow from './components/ChatWindow';
import FAQSection from './components/FAQ';
import { Icons } from './components/Icons';
import LiveTrackingPanel from './components/LiveTrackingPanel';
import RideRequest from './components/RideRequest';
import DriverDashboard from './components/DriverDashboard';
import { rideService, Ride as ApiRide, RideSearchParams } from './services/rideService';
import { locationService } from './services/locationService';
import { Coordinates, LocationState, DraftRide } from './types';

// Types adaptés pour le frontend
interface User {
  id: string;
  name: string;
  avatarUrl: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

interface Ride {
  id: string;
  driver: User;
  origin: string;
  destination: string;
  departureTime: string;
  price: number;
  currency: string;
  seatsAvailable: number;
  totalSeats: number;
  carModel: string;
  description?: string;
  features: string[];
  duration: string;
}

interface SearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  userLocation?: Coordinates;
}

// Convertir les données de l'API vers le format frontend
const mapApiRideToRide = (apiRide: ApiRide): Ride => {
  return {
    id: apiRide.id,
    driver: {
      id: apiRide.driver.id,
      name: `${apiRide.driver.firstName} ${apiRide.driver.lastName || ''}`.trim(),
      avatarUrl: apiRide.driver.avatarUrl || `https://ui-avatars.com/api/?name=${apiRide.driver.firstName}&background=10b981&color=fff`,
      rating: apiRide.driver.rating || 4.5,
      reviewCount: apiRide.driver.reviewCount || 0,
      isVerified: apiRide.driver.isVerified || false
    },
    origin: apiRide.origin,
    destination: apiRide.destination,
    departureTime: apiRide.departureTime,
    price: apiRide.price,
    currency: apiRide.currency || 'XOF',
    seatsAvailable: apiRide.seatsAvailable,
    totalSeats: apiRide.totalSeats,
    carModel: apiRide.carModel || 'Véhicule',
    description: apiRide.description,
    features: apiRide.features || [],
    duration: apiRide.estimatedDuration || '~3h'
  };
};

// --- COMPONENTS ---

// Liste des villes principales du Sénégal pour l'autocomplétion
const SENEGAL_CITIES = [
  'Dakar', 'Thiès', 'Saint-Louis', 'Touba', 'Kaolack', 'Ziguinchor', 
  'Rufisque', 'Mbour', 'Diourbel', 'Tambacounda', 'Kolda', 'Fatick',
  'Louga', 'Matam', 'Kédougou', 'Sédhiou', 'Pikine', 'Guédiawaye',
  'Saly', 'Somone', 'Joal-Fadiouth', 'Richard Toll', 'Podor', 'Vélingara',
  'Bignona', 'Oussouye', 'Cap Skirring', 'Kafountine', 'Palmarin'
];

// Composant d'autocomplétion pour les villes
const CityAutocomplete: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  required?: boolean;
  label?: string;
}> = ({ value, onChange, placeholder, icon, rightElement, required, label }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    
    if (inputValue.length >= 1) {
      const filtered = SENEGAL_CITIES.filter(city =>
        city.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setFocusedIndex(-1);
  };

  const handleSuggestionClick = (city: string) => {
    onChange(city);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[focusedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-10' : 'pr-4'} py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-gray-300 transition-all duration-200 outline-none text-gray-800 font-medium placeholder-gray-400`}
          required={required}
          autoComplete="off"
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((city, index) => (
            <button
              key={city}
              type="button"
              onClick={() => handleSuggestionClick(city)}
              className={`w-full px-4 py-2.5 text-left hover:bg-emerald-50 flex items-center gap-2 transition-all duration-150 ${
                index === focusedIndex ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
              }`}
            >
              <Icons.MapPin size={14} className="text-gray-400" />
              <span className="font-medium">{city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchForm: React.FC<{ 
  onSearch: (params: SearchParams) => void, 
  isLoading: boolean,
  initialValues?: SearchParams,
  onLocate: () => void,
  userLocation: LocationState
}> = ({ onSearch, isLoading, initialValues, onLocate, userLocation }) => {
  const [from, setFrom] = useState(initialValues?.origin || '');
  const [to, setTo] = useState(initialValues?.destination || '');
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().split('T')[0]);
  const [passengers, setPassengers] = useState(initialValues?.passengers || 1);

  useEffect(() => {
    if (userLocation.coords && userLocation.address && !from) {
      // Extraire le nom de la ville de l'adresse
      const cityMatch = userLocation.address.split(',')[0];
      if (cityMatch && SENEGAL_CITIES.some(c => userLocation.address.includes(c))) {
        setFrom(cityMatch);
      }
    }
  }, [userLocation.address, userLocation.coords, from]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ 
      origin: from, 
      destination: to, 
      date, 
      passengers,
      userLocation: userLocation.coords || undefined
    });
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-xl w-full max-w-4xl mx-auto -mt-16 md:-mt-20 relative z-10 border border-gray-100">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <CityAutocomplete
          value={from}
          onChange={setFrom}
          placeholder="Départ (ex: Dakar)"
          icon={<Icons.MapPin size={20} />}
          rightElement={
            <button
              type="button"
              onClick={onLocate}
              title="Utiliser ma position actuelle"
              className={`p-1.5 rounded-full transition-colors ${
                userLocation.loading 
                  ? 'animate-spin text-emerald-600' 
                  : userLocation.coords 
                    ? 'text-emerald-600 bg-emerald-50' 
                    : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100'
              }`}
            >
              {userLocation.loading ? (
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
              ) : (
                <Icons.Crosshair size={18} />
              )}
            </button>
          }
          required
        />
        
        <CityAutocomplete
          value={to}
          onChange={setTo}
          placeholder="Destination (ex: Touba)"
          icon={<Icons.MapPin size={20} />}
          required
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600">
              <Icons.Calendar size={20} />
            </div>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-gray-800 font-medium text-sm"
              required
            />
          </div>
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600">
              <Icons.Users size={20} />
            </div>
            <input
              type="number"
              min="1"
              max="8"
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value))}
              className="w-full pl-10 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-gray-800 font-medium"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Icons.Search size={20} />
              <span>Rechercher</span>
            </>
          )}
        </button>
      </form>
      
      {/* Message d'erreur de localisation */}
      {userLocation.error && (
        <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
          <Icons.AlertCircle size={16} />
          <span>{userLocation.error}</span>
        </div>
      )}
    </div>
  );
};

const RideCard: React.FC<{ ride: Ride, onClick: () => void }> = ({ ride, onClick }) => {
  const departureDate = new Date(ride.departureTime);
  const timeString = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateString = departureDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 hover:shadow-xl hover:border-emerald-300 transition-all transform hover:-translate-y-2 cursor-pointer group flex flex-col min-h-[320px]"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col relative pl-6 border-l-2 border-emerald-200 space-y-6">
          <div className="relative">
            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900">{timeString}</span>
              <span className="text-gray-600">{ride.origin}</span>
            </div>
          </div>
          <div className="relative pl-0 text-xs text-gray-400 flex items-center gap-1">
            <Icons.Clock size={12} />
            {ride.duration}
          </div>
          <div className="relative">
            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-gray-800 ring-4 ring-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-gray-600">{ride.destination}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-bold text-emerald-600">
            {ride.price.toLocaleString('fr-FR')}
          </span>
          <span className="text-xs text-gray-400">{ride.currency}</span>
        </div>
      </div>

      {/* Features tags */}
      {ride.features.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {ride.features.slice(0, 3).map(f => (
            <span key={f} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
              {f === 'Climatisation' ? '❄️' : f === 'Musique' ? '🎵' : f === 'Bagages acceptés' ? '🧳' : f === 'Non-fumeur' ? '🚭' : '✓'} {f}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-auto">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={ride.driver.avatarUrl} 
              alt={ride.driver.name} 
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
            {ride.driver.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Icons.CheckCircle size={14} className="text-blue-500 fill-blue-100" />
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{ride.driver.name}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Icons.Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-gray-700">{ride.driver.rating}</span>
              <span className="text-gray-400">({ride.driver.reviewCount})</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium">
            {ride.seatsAvailable} place{ride.seatsAvailable > 1 ? 's' : ''}
          </span>
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Icons.ChevronRight size={18} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

const RideDetails: React.FC<{ 
  ride: Ride, 
  onBack: () => void, 
  onBook: () => void,
  onChat: () => void
}> = ({ ride, onBack, onBook, onChat }) => {
  const departureDate = new Date(ride.departureTime);
  const formattedDate = departureDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  // Calcul heure d'arrivée estimée
  const durationMatch = ride.duration?.match(/(\d+)/);
  const durationMinutes = durationMatch ? parseInt(durationMatch[1]) * 60 : 120;
  const arrivalDate = new Date(departureDate.getTime() + durationMinutes * 60000);
  const arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const featureEmojis: { [key: string]: string } = {
    'Climatisation': '❄️',
    'Bagages acceptés': '🧳',
    'Non-fumeur': '🚭',
    'Musique': '🎵',
    'Animaux acceptés': '🐕',
    'WiFi': '📶',
    'Prise USB': '🔌',
    'Silence préféré': '🤫'
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Bouton retour */}
      <button onClick={onBack} className="flex items-center gap-2 text-emerald-600 font-medium mb-6 hover:gap-3 transition-all group">
        <Icons.ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={20} />
        Retour aux résultats
      </button>

      {/* En-tête avec date */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Icons.Calendar size={16} />
            {formattedDate}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {ride.origin} → {ride.destination}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-600">{ride.price.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">{ride.currency} / place</div>
        </div>
      </div>

      {/* Timeline du trajet */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Icons.Clock size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">Durée estimée: <strong className="text-gray-900">{ride.duration}</strong></span>
          </div>
          
          <div className="flex flex-col relative pl-6 border-l-2 border-emerald-200 space-y-10">
            {/* Départ */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formattedTime}</div>
                  <div className="text-gray-700 font-medium">{ride.origin}</div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Départ</span>
              </div>
            </div>
            
            {/* Arrivée */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-5 h-5 rounded-full bg-gray-800 ring-4 ring-gray-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{arrivalTime}</div>
                  <div className="text-gray-700 font-medium">{ride.destination}</div>
                </div>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">Arrivée</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Infos rapides */}
        <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-wrap gap-4 justify-around text-center">
          <div>
            <Icons.Users className="mx-auto text-gray-400 mb-1" size={20} />
            <div className="text-sm text-gray-500">Places</div>
            <div className="font-bold text-gray-900">{ride.seatsAvailable}</div>
          </div>
          <div>
            <Icons.Car className="mx-auto text-gray-400 mb-1" size={20} />
            <div className="text-sm text-gray-500">Véhicule</div>
            <div className="font-bold text-gray-900 text-sm">{ride.carModel || 'Non précisé'}</div>
          </div>
          <div>
            <Icons.Star className="mx-auto text-yellow-400 fill-yellow-400 mb-1" size={20} />
            <div className="text-sm text-gray-500">Note</div>
            <div className="font-bold text-gray-900">{ride.driver.rating}/5</div>
          </div>
        </div>
      </div>

      {/* Conducteur */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Icons.User size={20} className="text-gray-400" />
          Votre conducteur
        </h3>
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="relative">
              <img src={ride.driver.avatarUrl} alt={ride.driver.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100" />
              {ride.driver.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white">
                  <Icons.CheckCircle size={12} />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900">{ride.driver.name}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Icons.Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="font-medium">{ride.driver.rating}/5</span>
                <span className="text-gray-300">•</span>
                <span>{ride.driver.reviewCount} avis</span>
              </div>
              {ride.driver.isVerified && (
                <div className="flex items-center gap-1 text-sm text-emerald-600 mt-2 font-medium">
                  <Icons.Shield size={14} />
                  Profil vérifié
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={onChat}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-emerald-100 rounded-xl transition-colors group"
          >
            <Icons.MessageCircle className="text-gray-600 group-hover:text-emerald-600" size={20} />
            <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700 hidden sm:inline">Contacter</span>
          </button>
        </div>
        
        {ride.description && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-gray-600 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed italic">
              "{ride.description}"
            </p>
          </div>
        )}
      </div>

      {/* Options du trajet */}
      {ride.features.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Icons.CheckCircle size={20} className="text-emerald-500" />
            Ce trajet inclut
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ride.features.map(f => (
              <div key={f} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium">
                <span>{featureEmojis[f] || '✓'}</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton de réservation */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-sm p-4 -mx-4 rounded-2xl shadow-lg border border-gray-100">
        <button 
          onClick={onBook}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all text-lg flex items-center justify-center gap-2"
        >
          <Icons.CheckCircle size={20} />
          Réserver pour {ride.price.toLocaleString('fr-FR')} {ride.currency}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-2">
          <Icons.Shield size={12} />
          Paiement sécurisé via Orange Money ou Wave
          <span className="text-gray-300">•</span>
          Annulation gratuite
        </p>
      </div>
    </div>
  );
};

const PublishCityInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    
    if (inputValue.length >= 1) {
      const filtered = SENEGAL_CITIES.filter(city =>
        city.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (city: string) => {
    onChange(city);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Icons.MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value.length >= 1 && suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => handleSuggestionClick(city)}
              className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 flex items-center gap-2 transition-colors text-gray-700"
            >
              <Icons.MapPin size={14} className="text-gray-400" />
              <span className="font-medium">{city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PublishForm: React.FC<{ 
  onPublish: (ride: DraftRide) => void, 
  onCancel: () => void,
  isAuthenticated?: boolean
}> = ({ onPublish, onCancel, isAuthenticated = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);
  const [formData, setFormData] = useState<DraftRide & { driverName?: string; driverPhone?: string }>({
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    price: 3500,
    seats: 3,
    carModel: '',
    description: '',
    features: ['Climatisation'],
    driverName: '',
    driverPhone: ''
  });

  const handleChange = (field: keyof (DraftRide & { driverName?: string; driverPhone?: string }), value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Appeler l'API pour créer le trajet
      const departureTime = `${formData.date}T${formData.time}:00`;
      
      // Si l'utilisateur n'est pas connecté, on stocke localement et on affiche un message de succès
      if (!isAuthenticated) {
        // Stocker le trajet en localStorage pour les utilisateurs non connectés
        const pendingRides = JSON.parse(localStorage.getItem('pendingRides') || '[]');
        pendingRides.push({
          ...formData,
          departureTime,
          id: 'pending_' + Date.now(),
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('pendingRides', JSON.stringify(pendingRides));
        setPublishedSuccess(true);
      } else {
        await rideService.createRide({
          origin: formData.origin,
          destination: formData.destination,
          departureTime,
          price: formData.price,
          seatsAvailable: formData.seats,
          carModel: formData.carModel,
          description: formData.description,
          features: formData.features
        });
        onPublish(formData);
      }
    } catch (error) {
      console.error('Erreur création trajet:', error);
      // Même en cas d'erreur API, on affiche le succès pour les non-connectés
      if (!isAuthenticated) {
        setPublishedSuccess(true);
      } else {
        alert('Erreur lors de la publication du trajet');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Écran de succès pour les utilisateurs non connectés
  if (publishedSuccess && !isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
          <Icons.CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 Trajet publié avec succès !</h2>
        <p className="text-gray-600 mb-6">
          Votre trajet <strong>{formData.origin}</strong> → <strong>{formData.destination}</strong> est maintenant visible par les passagers.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <Icons.AlertCircle className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <p className="text-yellow-800 font-medium">Conseil</p>
              <p className="text-yellow-700 text-sm">
                Créez un compte pour gérer vos trajets, recevoir des notifications et être contacté par les passagers.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <button 
            onClick={onCancel}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const minDate = new Date().toISOString().split('T')[0];
  const featureOptions = ['Climatisation', 'Bagages acceptés', 'Non-fumeur', 'Musique', 'Animaux acceptés'];
  const isFormValid = Boolean(
    formData.origin &&
    formData.destination &&
    formData.date &&
    formData.time &&
    (isAuthenticated || (formData.driverName && formData.driverPhone))
  );
  const previewDate = formData.date ? new Date(`${formData.date}T${formData.time || '00:00'}`) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-500 text-white p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top, rgba(255,255,255,0.4), transparent 55%)' }}></div>
        <div className="relative flex flex-col lg:flex-row gap-8 lg:items-center">
          <div className="flex-1 space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Publier un trajet</p>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">Une interface premium pour annoncer votre trajet</h1>
            <p className="text-white/80 text-base md:text-lg max-w-2xl">
              Renseignez votre itinéraire, vos disponibilités et vos options confort. Votre annonce sera immédiatement visible par des centaines de passagers SUNU YOON.
            </p>
            <div className="flex flex-wrap gap-6 text-sm text-white/80">
              <div>
                <p className="text-2xl font-bold text-white">{formData.seats}</p>
                <p>Places prévues</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formData.price.toLocaleString('fr-FR')}</p>
                <p>Prix/passager (XOF)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formData.features.length}</p>
                <p>Options activées</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur">
            <p className="text-white/70 text-xs uppercase tracking-widest mb-2">Votre trajet</p>
            <div className="text-lg font-semibold">
              {formData.origin || 'Départ'}
              <span className="mx-2 text-white/60">→</span>
              {formData.destination || 'Arrivée'}
            </div>
            <p className="text-sm text-white/80 mt-2">
              {previewDate ? previewDate.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Date et heure à définir'}
            </p>
            <p className="text-sm text-white/80 mt-1">{formData.carModel || 'Modèle de véhicule non renseigné'}</p>
          </div>
          <button
            onClick={onCancel}
            className="absolute top-6 right-6 text-sm font-medium text-white/80 hover:text-white flex items-center gap-2"
          >
            <Icons.ChevronRight className="rotate-180" size={16} />
            Retour
          </button>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 md:items-center">
          <div className="flex items-center gap-3 text-emerald-800 font-semibold">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600">
              <Icons.CheckCircle size={20} />
            </div>
            Publiez gratuitement sans compte
          </div>
          <p className="text-sm text-emerald-800 flex-1">Nous utiliserons votre nom et numéro pour informer les passagers intéressés. Créez un compte plus tard pour gérer vos annonces.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Itinéraire</p>
                <h2 className="text-2xl font-bold text-gray-900 mt-2">Points de départ et d'arrivée</h2>
              </div>
              <span className="text-xs font-semibold text-gray-400">1/3</span>
            </div>
            <div className="grid gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Lieu de départ*</label>
                <PublishCityInput
                  value={formData.origin}
                  onChange={(val) => handleChange('origin', val)}
                  placeholder="Ex: Dakar, Liberté 6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Lieu d'arrivée*</label>
                <PublishCityInput
                  value={formData.destination}
                  onChange={(val) => handleChange('destination', val)}
                  placeholder="Ex: Saint-Louis, Gare routière"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Horaires & véhicule</p>
                <h2 className="text-2xl font-bold text-gray-900 mt-2">Quand partez-vous ?</h2>
              </div>
              <span className="text-xs font-semibold text-gray-400">2/3</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Date*</label>
                <input
                  type="date"
                  value={formData.date}
                  min={minDate}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Heure*</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Véhicule</label>
              <input
                type="text"
                value={formData.carModel}
                onChange={(e) => handleChange('carModel', e.target.value)}
                placeholder="Ex: Peugeot 308, Toyota Corolla..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </section>

          {!isAuthenticated && (
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Icons.User size={18} />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Coordonnées</p>
                  <h2 className="text-xl font-bold text-gray-900">Présentez-vous aux passagers</h2>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Nom complet*</label>
                  <input
                    type="text"
                    value={formData.driverName || ''}
                    onChange={(e) => handleChange('driverName', e.target.value)}
                    placeholder="Ex: Moussa Diop"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Téléphone / WhatsApp*
                    <span className="ml-2 text-xs text-emerald-600">📱 Lien WhatsApp auto</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.driverPhone || ''}
                    onChange={(e) => handleChange('driverPhone', e.target.value)}
                    placeholder="Ex: 221771234567 (avec indicatif +221)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    👉 Format: 221XXXXXXXXX (ex: 221771234567). Les passagers pourront vous contacter directement sur WhatsApp!
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500">Ces informations ne sont visibles que par les passagers intéressés. Elles permettent de vous contacter rapidement.</p>
            </section>
          )}

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Confort & infos</p>
                <h2 className="text-2xl font-bold text-gray-900 mt-2">Personnalisez votre offre</h2>
              </div>
              <span className="text-xs font-semibold text-gray-400">3/3</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-3">Options disponibles</label>
              <div className="flex flex-wrap gap-2">
                {featureOptions.map(opt => {
                  const isSelected = formData.features.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const newFeatures = isSelected
                          ? formData.features.filter(f => f !== opt)
                          : [...formData.features, opt];
                        handleChange('features', newFeatures);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-inner'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Message aux passagers</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Dites-en plus sur vos habitudes de conduite, vos préférences ou un point de rendez-vous précis."
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none h-28 resize-none"
              />
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8">
          <section className="bg-gray-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at top, rgba(16,185,129,0.4), transparent 60%)' }}></div>
            <div className="relative space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Récapitulatif</p>
                <h3 className="text-2xl font-semibold mt-2">Votre trajet</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-white/60 uppercase">Départ</p>
                  <p className="text-lg font-semibold">{formData.origin || 'À renseigner'}</p>
                </div>
                <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-white/60 uppercase">Arrivée</p>
                  <p className="text-lg font-semibold">{formData.destination || 'À renseigner'}</p>
                </div>
                <div className="bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60 uppercase">Date & heure</p>
                    <p className="text-lg font-semibold">
                      {previewDate
                        ? previewDate.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                        : 'À confirmer'}
                    </p>
                  </div>
                  <Icons.Calendar size={28} className="text-white/60" />
                </div>
                {formData.carModel && (
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                    <p className="text-xs text-white/60 uppercase">Véhicule</p>
                    <p className="text-lg font-semibold">{formData.carModel}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/70">
                {formData.features.map(feature => (
                  <span key={feature} className="px-3 py-1 rounded-full border border-white/20 bg-white/5">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Tarification</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">Ajustez vos conditions</h3>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Prix par passager</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{formData.price.toLocaleString('fr-FR')} XOF</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('price', Math.max(500, formData.price - 500))}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all transform active:scale-95"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('price', formData.price + 500)}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all transform active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Saisir votre tarif</label>
                <div className="flex items-center rounded-2xl border-2 border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden transition-all">
                  <span className="px-4 py-3 text-gray-500 bg-gray-50 border-r border-gray-100 font-semibold">XOF</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.price}
                    onChange={(e) => { const value = e.target.value.replace(/[^0-9]/g, ''); handleChange('price', value === '' ? 0 : parseInt(value, 10)); }}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (!value || value < 1) {
                        handleChange('price', 500);
                      }
                    }}
                    placeholder="Ex: 2500"
                    className="w-full px-4 py-3 text-2xl font-bold text-emerald-600 bg-white focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Les voyageurs apprécient les tarifs clairs.  Tapez librement le tarif de votre choix.</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Places disponibles</p>
                  <p className="text-3xl font-extrabold text-gray-900">{formData.seats}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('seats', Math.max(1, formData.seats - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all transform active:scale-95"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('seats', Math.min(7, formData.seats + 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all transform active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !isFormValid}
                className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg hover:shadow-2xl hover:from-emerald-700 hover:to-emerald-600 transform hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Publication...
                  </>
                ) : (
                  <>
                    <Icons.CheckCircle size={18} />
                    Publier le trajet
                  </>
                )}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 rounded-2xl font-semibold text-gray-500 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all transform active:scale-95"
              >
                Annuler
              </button>
              <p className="text-xs text-gray-400 text-center">
                En publiant, vous acceptez les conditions SUNU YOON et vous engagez à honorer votre trajet.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const ProfileView: React.FC<{ 
  onNavigate: (v: string) => void,
  refreshKey?: number
}> = ({ onNavigate, refreshKey = 0 }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'bookings' | 'announcements'>('bookings');
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const rides = await rideService.getMyRides();
        setMyRides(rides.map(mapApiRideToRide));
        // TODO: Charger les réservations quand l'API sera disponible
      } catch (error) {
        console.error('Erreur chargement données:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [refreshKey]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
         <div className="relative">
            <img 
              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.firstName}&background=10b981&color=fff`} 
              alt={user.firstName} 
              className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md" 
            />
            {user.isVerified && (
              <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white">
                <Icons.CheckCircle size={16} />
              </div>
            )}
         </div>
         <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.firstName} {user.lastName}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500 mb-4">
              <Icons.Star className="text-yellow-400 fill-yellow-400" size={16} />
              <span className="font-semibold text-gray-900">{user.rating || 'N/A'}</span>
              <span>•</span>
              <span>{user.reviewCount || 0} avis</span>
              {user.isVerified && (
                <>
                  <span>•</span>
                  <span className="text-emerald-600 font-medium">Membre vérifié</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                <Icons.Settings size={16} />
                Paramètres
              </button>
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
              >
                Déconnexion
              </button>
            </div>
         </div>
         <div className="bg-emerald-50 p-4 rounded-xl text-center min-w-[120px]">
            <div className="text-sm text-gray-500 mb-1">Trajets</div>
            <div className="text-2xl font-bold text-emerald-600">{myRides.length}</div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'bookings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Mes Réservations
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'announcements' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Mes Trajets ({myRides.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : activeTab === 'announcements' ? (
          myRides.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <Icons.Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Aucun trajet publié</h3>
              <p className="text-gray-500 mb-6">Vous n'avez pas encore publié de trajet.</p>
              <button onClick={() => onNavigate('publish')} className="text-emerald-600 font-bold hover:underline">
                Publier un trajet
              </button>
            </div>
          ) : (
            myRides.map(ride => (
              <div key={ride.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-900 mb-1">
                    {new Date(ride.departureTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {new Date(ride.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <span>{ride.origin}</span>
                    <Icons.ChevronRight size={14} />
                    <span>{ride.destination}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Icons.Users size={12} /> {ride.seatsAvailable} places restantes</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-emerald-600">{ride.price} {ride.currency}</span>
                </div>
              </div>
            ))
          )
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
            <Icons.Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Aucune réservation</h3>
            <p className="text-gray-500 mb-6">Vous n'avez pas encore réservé de trajet.</p>
            <button onClick={() => onNavigate('search')} className="text-emerald-600 font-bold hover:underline">
              Rechercher un trajet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

function AppContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [currentView, setCurrentView] = useState('home'); 
  const [searchResults, setSearchResults] = useState<Ride[]>([]);
  const [publishedRides, setPublishedRides] = useState<Ride[]>([]); // Stock des trajets publiés
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  
  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);
  
  // Transport à la demande (mode Uber)
  const [showRequestRide, setShowRequestRide] = useState(false);
  const [showDriverMode, setShowDriverMode] = useState(false);
  const [isDriverAvailable, setIsDriverAvailable] = useState(false);

  // Geolocation State
  const [userLocation, setUserLocation] = useState<LocationState>({
    coords: null,
    address: '',
    loading: false,
    error: null
  });

  const highlightedDriverRide = useMemo<Ride>(() => ({
    id: 'featured-cheikh-ndiaye',
    driver: {
      id: 'driver-featured',
      name: 'Cheikh Ndiaye',
      avatarUrl: 'https://ui-avatars.com/api/?name=Cheikh+Ndiaye&background=059669&color=fff',
      rating: 4.9,
      reviewCount: 128,
      isVerified: true
    },
    origin: 'Dakar, Plateau',
    destination: 'Thiès, Grand Standing',
    departureTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    price: 4500,
    currency: 'XOF',
    seatsAvailable: 2,
    totalSeats: 4,
    carModel: 'Toyota Corolla 2019',
    description: 'Départ ponctuel avec climatisation et rafraîchissements. Pause à Keur Massar si besoin.',
    features: ['Climatisation', 'Non-fumeur', 'Bagages acceptés'],
    duration: '1h 15m'
  }), []);

  // Géolocalisation automatique au chargement (silencieuse)
  useEffect(() => {
    const initLocation = async () => {
      try {
        const result = await locationService.getCurrentPositionFast({
          onStatusChange: (status) => {
            if (status === 'searching') {
              setUserLocation(prev => ({ ...prev, loading: true }));
            }
          }
        });
        
        setUserLocation({
          coords: result.coords,
          address: result.address || 'Ma position',
          loading: false,
          error: null
        });
      } catch (error) {
        // Silencieux en cas d'échec initial
        console.log('Géolocalisation initiale:', error);
      }
    };
    
    // Lancer la géolocalisation après un court délai
    const timer = setTimeout(initLocation, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Charger les trajets publiés depuis le localStorage au démarrage
  useEffect(() => {
    try {
      const storedRides = localStorage.getItem('publishedRides');
      if (storedRides) {
        const rides = JSON.parse(storedRides);
        setPublishedRides(rides);
      }
    } catch (error) {
      console.error('Erreur chargement trajets:', error);
    }
  }, []);

  const handleGeolocate = useCallback(async () => {
    setUserLocation(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await locationService.getCurrentPositionFast({
        onStatusChange: (status) => {
          if (status === 'error') {
            setUserLocation(prev => ({ ...prev, loading: false }));
          }
        },
        onLocationUpdate: (update) => {
          // Mise à jour silencieuse de la précision
          setUserLocation(prev => ({
            ...prev,
            coords: update.coords
          }));
        }
      });

      setUserLocation({
        coords: result.coords,
        address: result.address || 'Ma position',
        loading: false,
        error: null
      });
    } catch (error: any) {
      setUserLocation(prev => ({
        ...prev,
        loading: false,
        error: error.message || "Erreur de localisation"
      }));
    }
  }, []);

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);
    
    try {
      const rides = await rideService.searchRides({
        origin: params.origin,
        destination: params.destination,
        date: params.date,
        seats: params.passengers
      });
      
      const apiRides = rides.map(mapApiRideToRide);
      
      // Filtrer les trajets publiés localement qui correspondent à la recherche
      const matchingLocalRides = publishedRides.filter(ride => {
        const originMatch = ride.origin.toLowerCase().includes(params.origin.toLowerCase()) ||
                           params.origin.toLowerCase().includes(ride.origin.toLowerCase());
        const destMatch = ride.destination.toLowerCase().includes(params.destination.toLowerCase()) ||
                         params.destination.toLowerCase().includes(ride.destination.toLowerCase());
        const dateMatch = ride.departureTime.startsWith(params.date);
        
        return originMatch && destMatch && dateMatch && ride.seatsAvailable >= params.passengers;
      });
      
      // Fusionner les résultats : trajets locaux en premier
      const allRides = [...matchingLocalRides, ...apiRides];
      setSearchResults(allRides);
      setCurrentView('search');
    } catch (error) {
      console.error('Erreur recherche:', error);
      // En cas d'erreur API, afficher quand même les trajets locaux
      const matchingLocalRides = publishedRides.filter(ride => {
        const originMatch = ride.origin.toLowerCase().includes(params.origin.toLowerCase()) ||
                           params.origin.toLowerCase().includes(ride.origin.toLowerCase());
        const destMatch = ride.destination.toLowerCase().includes(params.destination.toLowerCase()) ||
                         params.destination.toLowerCase().includes(ride.destination.toLowerCase());
        const dateMatch = ride.departureTime.startsWith(params.date);
        
        return originMatch && destMatch && dateMatch && ride.seatsAvailable >= params.passengers;
      });
      setSearchResults(matchingLocalRides);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRideClick = (ride: Ride) => {
    setSelectedRide(ride);
    setCurrentView('ride-details');
  };

  const initiateBooking = () => {
    setShowBookingModal(true);
  };

  const handlePublishRide = async (draft: DraftRide) => {
    try {
      // Créer un trajet à partir du draft
      const newRide: Ride = {
        id: `local_${Date.now()}`,
        driver: user ? {
          id: user.id,
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
          avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.firstName}&background=10b981&color=fff`,
          rating: 4.5,
          reviewCount: 0,
          isVerified: user.isVerified || false
        } : {
          id: 'guest',
          name: 'Nouveau conducteur',
          avatarUrl: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff',
          rating: 4.5,
          reviewCount: 0,
          isVerified: false
        },
        origin: draft.origin,
        destination: draft.destination,
        departureTime: `${draft.date}T${draft.time}:00`,
        price: draft.price,
        currency: 'XOF',
        seatsAvailable: draft.seats,
        totalSeats: draft.seats,
        carModel: draft.carModel || 'Véhicule',
        description: draft.description,
        features: draft.features,
        duration: '~3h'
      };

      // Ajouter le trajet au stock local
      setPublishedRides(prev => [newRide, ...prev]);
      
      // Si on a une recherche active, l'ajouter aussi aux résultats
      if (searchResults.length > 0 || searchParams) {
        setSearchResults(prev => [newRide, ...prev]);
      }

      // Sauvegarder dans localStorage pour persistance
      const storedRides = JSON.parse(localStorage.getItem('publishedRides') || '[]');
      storedRides.push(newRide);
      localStorage.setItem('publishedRides', JSON.stringify(storedRides));

      // Forcer le rechargement du profil
      setProfileRefreshKey(prev => prev + 1);
      setCurrentView('profile');
    } catch (error) {
      console.error('Erreur lors de la publication:', error);
    }
  };

  const handleBookingSuccess = (bookingId: string) => {
    console.log('Réservation réussie:', bookingId);
    setShowBookingModal(false);
    setCurrentView('profile');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home': {
        const highlightedDepartureDate = new Date(highlightedDriverRide.departureTime);
        return (
          <>
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white py-20 px-4 md:py-32 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
               <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse"></div>
               
               <div className="max-w-6xl mx-auto relative z-10 text-center">
                 <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                   <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                   </span>
                   +500 trajets disponibles aujourd'hui
                 </div>
                 <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
                   Votre voyage commence<br className="hidden md:block" /> <span className="text-yellow-300">ici.</span>
                 </h1>
                 <p className="text-xl md:text-2xl text-emerald-100 mb-8 max-w-2xl mx-auto">
                   Rejoignez la plus grande communauté de covoiturage au Sénégal. Économique, convivial et sûr.
                 </p>
                 
                 {/* Quick action buttons */}
                 <div className="flex flex-wrap justify-center gap-4 mb-8">
                   <button
                     onClick={() => setShowRequestRide(true)}
                     className="flex items-center gap-2 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-2xl transform hover:scale-110 active:scale-95 transition-all duration-200"
                   >
                     <Icons.Navigation size={20} />
                     🚖 Course maintenant
                   </button>
                   <button
                     onClick={() => setCurrentView('publish')}
                     className="flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-2xl transform hover:scale-110 active:scale-95 transition-all duration-200"
                   >
                     <Icons.PlusCircle size={20} />
                     Proposer un trajet
                   </button>
                   <button
                     onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}
                     className="flex items-center gap-2 bg-emerald-700/50 backdrop-blur-sm text-white px-6 py-3 rounded-full font-bold border border-white/20 hover:bg-emerald-700/70 transform hover:scale-105 active:scale-95 transition-all duration-200"
                   >
                     <Icons.Search size={20} />
                     Trouver un trajet
                   </button>
                 </div>
                 
                 {/* Stats */}
                 <div className="flex justify-center gap-8 md:gap-16 mt-8 text-center">
                   <div>
                     <div className="text-3xl md:text-4xl font-bold text-white">15K+</div>
                     <div className="text-emerald-200 text-sm">Utilisateurs</div>
                   </div>
                   <div>
                     <div className="text-3xl md:text-4xl font-bold text-white">50K+</div>
                     <div className="text-emerald-200 text-sm">Trajets réalisés</div>
                   </div>
                   <div>
                     <div className="text-3xl md:text-4xl font-bold text-white">4.8</div>
                     <div className="text-emerald-200 text-sm">⭐ Note moyenne</div>
                   </div>
                 </div>
               </div>
            </div>

            <div className="relative z-20 px-4 mt-32 mb-12">
              <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 md:p-8 flex flex-col lg:flex-row gap-6 items-center">
                <div className="flex items-center gap-4 w-full lg:w-1/3">
                  <div className="relative">
                    <img
                      src={highlightedDriverRide.driver.avatarUrl}
                      alt={highlightedDriverRide.driver.name}
                      className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                    />
                    {highlightedDriverRide.driver.isVerified && (
                      <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1 border-2 border-white">
                        <Icons.CheckCircle size={14} />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Conducteur à l'honneur</p>
                    <h3 className="text-xl font-bold text-gray-900">{highlightedDriverRide.driver.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Icons.Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold text-gray-900">{highlightedDriverRide.driver.rating}</span>
                      <span className="text-gray-300">•</span>
                      <span>{highlightedDriverRide.driver.reviewCount} avis</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{highlightedDriverRide.carModel}</p>
                  </div>
                </div>

                <div className="flex-1 grid sm:grid-cols-2 gap-6 w-full">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Itinéraire</p>
                      <p className="text-lg font-semibold text-gray-900">{highlightedDriverRide.origin}</p>
                      <p className="text-sm text-emerald-600 flex items-center gap-2">
                        <Icons.ChevronRight size={16} />
                        {highlightedDriverRide.destination}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Départ</p>
                      <p className="text-base font-semibold text-gray-900">
                        {highlightedDepartureDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {highlightedDepartureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-gray-300 mx-1">•</span>
                        {highlightedDriverRide.duration}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Ce trajet inclut</p>
                    <div className="flex flex-wrap gap-2">
                      {highlightedDriverRide.features.map(feature => (
                        <span key={feature} className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                          {feature}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {highlightedDriverRide.description}
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-48 space-y-3 text-center lg:text-right">
                  <div>
                    <p className="text-sm text-gray-500">Prix par place</p>
                    <p className="text-3xl font-extrabold text-emerald-600">
                      {highlightedDriverRide.price.toLocaleString('fr-FR')} {highlightedDriverRide.currency}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {highlightedDriverRide.seatsAvailable} / {highlightedDriverRide.totalSeats} places restantes
                  </p>
                  <button
                    onClick={() => handleRideClick(highlightedDriverRide)}
                    className="w-full py-3 rounded-2xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg"
                  >
                    Rejoindre ce trajet
                  </button>
                </div>
              </div>
            </div>
            
            <div className="px-4 pb-20">
               {/* Actions rapides */}
               <div className="max-w-4xl mx-auto mt-8 mb-6">
                 <div className="grid grid-cols-2 gap-4">
                   <button
                     onClick={() => setCurrentView('publish')}
                     className="px-6 py-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex flex-col items-center justify-center gap-2"
                   >
                     <Icons.PlusCircle size={28} />
                     <span>Proposer un trajet</span>
                   </button>
                   <button
                     onClick={() => document.getElementById('search-origin')?.focus()}
                     className="px-6 py-4 rounded-2xl bg-white border-2 border-emerald-600 text-emerald-600 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex flex-col items-center justify-center gap-2"
                   >
                     <Icons.Search size={28} />
                     <span>Trouver un trajet</span>
                   </button>
                 </div>
               </div>

               {/* Formulaire de recherche */}
               <SearchForm 
                 onSearch={handleSearch} 
                 isLoading={isLoading} 
                 onLocate={handleGeolocate} 
                 userLocation={userLocation}
               />

               {/* Comment ça marche - Version simplifiée */}
               <div className="max-w-4xl mx-auto mt-20 mb-20">
                 <div className="text-center mb-12">
                   <h2 className="text-2xl font-bold text-gray-900 mb-4">Comment ça marche ?</h2>
                   <p className="text-gray-600 max-w-xl mx-auto">En 3 étapes simples</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                       <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                         1
                       </div>
                       <h3 className="text-lg font-bold mb-2 text-gray-900">Recherchez</h3>
                       <p className="text-gray-600 text-sm">Entrez votre itinéraire</p>
                    </div>
                    <div className="text-center">
                       <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                         2
                       </div>
                       <h3 className="text-lg font-bold mb-2 text-gray-900">Réservez</h3>
                       <p className="text-gray-600 text-sm">Contactez le conducteur</p>
                    </div>
                    <div className="text-center">
                       <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                         3
                       </div>
                       <h3 className="text-lg font-bold mb-2 text-gray-900">Voyagez</h3>
                       <p className="text-gray-600 text-sm">Partez ensemble</p>
                    </div>
                 </div>
               </div>
            </div>
          <>
        );
      }

      case 'search':
        return (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <SearchForm 
              onSearch={handleSearch} 
              isLoading={isLoading} 
              initialValues={searchParams || undefined}
              onLocate={handleGeolocate} 
              userLocation={userLocation}
            />
            
            <div className="mt-32 mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {isLoading ? 'Recherche en cours...' : `${searchResults.length} trajet${searchResults.length > 1 ? 's' : ''} disponible${searchResults.length > 1 ? 's' : ''}`}
                </h2>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Trier par:</span>
                    <select className="text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="departure">Heure de départ</option>
                      <option value="price">Prix croissant</option>
                      <option value="rating">Meilleures notes</option>
                    </select>
                  </div>
                )}
              </div>
              
              {/* Quick filters */}
              {searchResults.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <button className="px-3 py-1.5 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors">
                    Tous
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 border border-gray-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                    ❄️ Climatisation
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 border border-gray-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                    🧳 Bagages
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 border border-gray-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                    ⭐ 4+ étoiles
                  </button>
                </div>
              )}
              
              {isLoading ? (
                 <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                   {[1,2,3,4,5,6].map(i => (
                     <div key={i} className="min-h-[320px] bg-white rounded-2xl border border-gray-100 p-7 animate-pulse flex flex-col shadow-sm">
                       <div className="flex justify-between mb-6">
                         <div className="space-y-4 flex-1">
                           <div className="h-5 bg-gray-200 rounded w-2/5"></div>
                           <div className="h-4 bg-gray-100 rounded w-3/5"></div>
                         </div>
                         <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
                       </div>
                       <div className="flex items-center gap-4 mt-auto pt-6 border-t border-gray-100">
                         <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                         <div className="space-y-2 flex-1">
                           <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                           <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
              ) : (
                <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {searchResults.map(ride => (
                    <RideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />
                  ))}
                  {searchResults.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 col-span-full">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Search className="text-gray-400" size={28} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun trajet trouvé</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Essayez de changer la date ou vérifiez l'orthographe des villes.
                      </p>
                      <button
                        onClick={() => setCurrentView('publish')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
                      >
                        <Icons.PlusCircle size={18} />
                        Proposer ce trajet
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'ride-details':
        return selectedRide ? (
          <RideDetails 
            ride={selectedRide} 
            onBack={() => setCurrentView('search')} 
            onBook={initiateBooking}
            onChat={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
              } else {
                setShowChatWindow(true);
              }
            }}
          />
        ) : null;
      
      case 'publish':
        // Publication accessible même sans compte
        return <PublishForm onPublish={handlePublishRide} onCancel={() => setCurrentView('home')} isAuthenticated={isAuthenticated} />;
      
      case 'profile':
        if (!isAuthenticated) {
           setCurrentView('home');
           return null;
        }
        return <ProfileView onNavigate={setCurrentView} refreshKey={profileRefreshKey} />;

      default:
        return null;
    }
  };

  // Afficher un loader pendant le chargement de l'auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      onNavigate={(view) => {
        if (view === 'driver-mode') {
          setShowDriverMode(true);
        } else {
          setCurrentView(view);
        }
      }} 
      currentView={currentView}
      user={user ? {
        id: user.id,
        name: `${user.firstName} ${user.lastName || ''}`.trim(),
        avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.firstName}&background=10b981&color=fff`,
        rating: user.rating || 4.5,
        reviewCount: user.reviewCount || 0,
        isVerified: user.isVerified || false
      } : null}
      onLoginClick={() => setShowAuthModal(true)}
      onLogoutClick={() => {}}
    >
      {renderContent()}
      <CookieBanner />
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // Fermer le modal
          setShowAuthModal(false);
          // Rediriger vers le profil après connexion/inscription réussie
          setCurrentView('profile');
          // Afficher un message de succès
          console.log('✅ Connexion réussie - redirection vers profil');
        }}
      />
      
      {/* Modal Demande de Course (Client) */}
      {showRequestRide && userLocation.coords && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">🚖 Demander une course</h2>
              <button
                onClick={() => setShowRequestRide(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icons.X size={24} />
              </button>
            </div>
            <div className="p-6">
              <RideRequest
                userLocation={userLocation.coords}
                onRequestRide={(request) => {
                  console.log('Demande de course:', request);
                  // TODO: Envoyer au backend via WebSocket
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Mode Chauffeur */}
      {showDriverMode && userLocation.coords && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">🚗 Mode Chauffeur</h2>
              <button
                onClick={() => setShowDriverMode(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icons.X size={24} />
              </button>
            </div>
            <div className="p-6">
              <DriverDashboard
                driverLocation={userLocation.coords}
                isAvailable={isDriverAvailable}
                onToggleAvailability={() => setIsDriverAvailable(!isDriverAvailable)}
                onAcceptRide={(requestId, estimatedArrival) => {
                  console.log('Course acceptée:', requestId, estimatedArrival);
                  // TODO: Notifier le client via WebSocket
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {selectedRide && (
        <>
          <BookingModal 
            isOpen={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            rideId={selectedRide.id}
            price={selectedRide.price}
            currency={selectedRide.currency}
            seats={selectedRide.seatsAvailable}
            origin={selectedRide.origin}
            destination={selectedRide.destination}
            departureTime={selectedRide.departureTime}
            driverName={selectedRide.driver.name}
            onSuccess={handleBookingSuccess}
          />
          
          <ChatWindow
            isOpen={showChatWindow}
            onClose={() => setShowChatWindow(false)}
            recipientId={selectedRide.driver.id}
            recipientName={selectedRide.driver.name}
            recipientAvatar={selectedRide.driver.avatarUrl}
            rideId={selectedRide.id}
          />
        </>
      )}
    </Layout>
  );
}

// Wrapper avec AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

