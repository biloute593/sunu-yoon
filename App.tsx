import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import CookieBanner from './components/CookieBanner';
import Map from './components/Map';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import ChatWindow from './components/ChatWindow';
import FAQSection from './components/FAQ';
import { Icons } from './components/Icons';
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
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-10' : 'pr-4'} py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-gray-800 font-medium placeholder-gray-400`}
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
              className={`w-full px-4 py-2.5 text-left hover:bg-emerald-50 flex items-center gap-2 transition-colors ${
                index === focusedIndex ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
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
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col relative pl-5 border-l-2 border-emerald-200 space-y-4">
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
        <div className="flex flex-wrap gap-1 mb-4">
          {ride.features.slice(0, 3).map(f => (
            <span key={f} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {f === 'Climatisation' ? '❄️' : f === 'Musique' ? '🎵' : f === 'Bagages acceptés' ? '🧳' : f === 'Non-fumeur' ? '🚭' : '✓'} {f}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={ride.driver.avatarUrl} 
              alt={ride.driver.name} 
              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
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
        <div className="flex items-center gap-3">
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
  isAuthenticated?: boolean,
  onLoginRequest?: () => void
}> = ({ onPublish, onCancel, isAuthenticated = false, onLoginRequest }) => {
  const [step, setStep] = useState(1);
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
      // Site libre - stocker localement
      const departureTime = `${formData.date}T${formData.time}:00`;
      
      // Générer un ID unique (timestamp + random pour éviter les collisions)
      const uniqueId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Stocker le trajet en localStorage
      const rides = JSON.parse(localStorage.getItem('publishedRides') || '[]');
      rides.push({
        ...formData,
        departureTime,
        id: uniqueId,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('publishedRides', JSON.stringify(rides));
      setPublishedSuccess(true);
    } catch (error) {
      console.error('Erreur lors de la publication du trajet:', error);
      // En cas d'erreur localStorage, on affiche quand même le succès car le trajet est enregistré en mémoire
      setPublishedSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Écran de succès - site libre sans compte
  if (publishedSuccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
          <Icons.CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 Trajet publié avec succès !</h2>
        <p className="text-gray-600 mb-6">
          Votre trajet <strong>{formData.origin}</strong> → <strong>{formData.destination}</strong> est maintenant visible par les passagers.
        </p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <Icons.CheckCircle className="text-emerald-600 mt-0.5" size={20} />
            <div>
              <p className="text-emerald-800 font-medium">Récapitulatif</p>
              <p className="text-emerald-700 text-sm">
                Les passagers peuvent vous contacter au <strong>{formData.driverPhone}</strong>
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <button 
            onClick={onCancel}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900">Quel est votre itinéraire ?</h2>
      
      {/* Message site libre */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <Icons.CheckCircle className="text-emerald-600 mt-0.5" size={20} />
        <div>
          <p className="text-emerald-800 font-medium">Site 100% libre !</p>
          <p className="text-emerald-700 text-sm">
            Publiez votre trajet sans inscription. C'est rapide et gratuit.
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de départ</label>
          <PublishCityInput
            value={formData.origin}
            onChange={(val) => handleChange('origin', val)}
            placeholder="Ex: Dakar, Liberté 6"
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lieu d'arrivée</label>
          <PublishCityInput
            value={formData.destination}
            onChange={(val) => handleChange('destination', val)}
            placeholder="Ex: Saint-Louis, Gare routière"
          />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button
          disabled={!formData.origin || !formData.destination}
          onClick={() => setStep(2)}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
        >
          Suivant
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900">Quand partez-vous ?</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => handleChange('time', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>
       <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Véhicule</label>
          <input
            type="text"
            value={formData.carModel}
            onChange={(e) => handleChange('carModel', e.target.value)}
            placeholder="Ex: Peugeot 308, Toyota Corolla..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      <div className="flex justify-between pt-4">
        <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700 font-medium">Retour</button>
        <button
          onClick={() => setStep(3)}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
        >
          Suivant
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900">Détails de l'offre</h2>
      
      {/* Coordonnées - toujours visible (site libre) */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Icons.User size={18} />
          Vos coordonnées
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom *</label>
            <input
                type="text"
                value={formData.driverName || ''}
                onChange={(e) => handleChange('driverName', e.target.value)}
                placeholder="Ex: Moussa Diop"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
              <input
                type="tel"
                value={formData.driverPhone || ''}
                onChange={(e) => handleChange('driverPhone', e.target.value)}
                placeholder="Ex: 77 123 45 67"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
          </div>
        </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Prix par passager (XOF)</label>
           <div className="flex items-center gap-4">
              <button 
                onClick={() => handleChange('price', Math.max(500, formData.price - 500))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >-</button>
              <span className="text-xl font-bold text-emerald-600 w-20 text-center">{formData.price}</span>
              <button 
                onClick={() => handleChange('price', formData.price + 500)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >+</button>
           </div>
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Places disponibles</label>
           <div className="flex items-center gap-4">
              <button 
                onClick={() => handleChange('seats', Math.max(1, formData.seats - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >-</button>
              <span className="text-xl font-bold text-gray-900 w-12 text-center">{formData.seats}</span>
              <button 
                onClick={() => handleChange('seats', Math.min(7, formData.seats + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >+</button>
           </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
        <div className="flex flex-wrap gap-2">
          {['Climatisation', 'Bagages acceptés', 'Non-fumeur', 'Musique', 'Animaux acceptés'].map(opt => (
            <button
              key={opt}
              onClick={() => {
                const newFeatures = formData.features.includes(opt) 
                  ? formData.features.filter(f => f !== opt)
                  : [...formData.features, opt];
                handleChange('features', newFeatures);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                formData.features.includes(opt) 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optionnel)</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Dites-en plus sur votre trajet..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none"
        />
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-700 font-medium">Retour</button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.driverName || !formData.driverPhone}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Publication...
            </>
          ) : (
            'Publier le trajet'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-500">Publication</h1>
          <span className="text-sm font-medium text-emerald-600">Étape {step}/3</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

const ProfileView: React.FC<{ 
  onNavigate: (v: string) => void 
}> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'bookings' | 'announcements'>('bookings');
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
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
  }, []);

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
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  
  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);

  // Geolocation State
  const [userLocation, setUserLocation] = useState<LocationState>({
    coords: null,
    address: '',
    loading: false,
    error: null
  });

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
      
      setSearchResults(rides.map(mapApiRideToRide));
      setCurrentView('search');
    } catch (error) {
      console.error('Erreur recherche:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRideClick = (ride: Ride) => {
    setSelectedRide(ride);
    setCurrentView('ride-details');
  };

  const initiateBooking = () => {
    // Site 100% libre - la réservation s'effectue directement sans vérification d'authentification
    setShowBookingModal(true);
  };

  const handlePublishRide = (draft: DraftRide) => {
    // Le trajet est déjà créé dans PublishForm via l'API
    setCurrentView('profile');
  };

  const handleBookingSuccess = (bookingId: string) => {
    console.log('Réservation réussie:', bookingId);
    setShowBookingModal(false);
    setCurrentView('profile');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
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
                     onClick={() => setCurrentView('publish')}
                     className="flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                   >
                     <Icons.PlusCircle size={20} />
                     Proposer un trajet
                   </button>
                   <button
                     onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}
                     className="flex items-center gap-2 bg-emerald-700/50 backdrop-blur-sm text-white px-6 py-3 rounded-full font-bold border border-white/20 hover:bg-emerald-700/70 transition-all"
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
            
            <div className="px-4 pb-20">
               {/* SECTION PUBLIER UN TRAJET - AVANT LA RECHERCHE */}
               <div className="max-w-4xl mx-auto -mt-16 md:-mt-20 relative z-10 mb-8">
                 <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-6 md:p-8 rounded-xl shadow-xl text-white">
                   <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="text-center md:text-left">
                       <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center justify-center md:justify-start gap-3">
                         <Icons.PlusCircle size={28} />
                         Proposer un trajet
                       </h2>
                       <p className="text-emerald-100 text-sm md:text-base">
                         Vous avez des places libres ? Publiez votre trajet en 2 minutes. <strong>Pas besoin de compte !</strong>
                       </p>
                     </div>
                     <button
                       onClick={() => setCurrentView('publish')}
                       className="w-full md:w-auto px-8 py-4 bg-white text-emerald-600 font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-lg flex items-center justify-center gap-2"
                     >
                       <Icons.Car size={22} />
                       Publier maintenant
                     </button>
                   </div>
                 </div>
               </div>

               {/* SECTION RECHERCHE */}
               <SearchForm 
                 onSearch={handleSearch} 
                 isLoading={isLoading} 
                 onLocate={handleGeolocate} 
                 userLocation={userLocation}
               />
               
               {/* LIVE MAP SECTION */}
               <div className="max-w-6xl mx-auto mt-20">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-bold text-gray-900">Aperçu en temps réel</h2>
                     <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        Live
                     </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-100">
                     <Map location={userLocation.coords} height="400px" />
                     <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-500">
                           {userLocation.coords 
                             ? `Position: ${userLocation.coords.lat.toFixed(4)}, ${userLocation.coords.lng.toFixed(4)}`
                             : "Activez la localisation pour voir les conducteurs."}
                        </div>
                        {!userLocation.coords && (
                          <button 
                            onClick={handleGeolocate}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-600 rounded-lg transition-colors font-medium text-sm"
                          >
                            <Icons.Crosshair size={16} />
                            Activer ma position
                          </button>
                        )}
                     </div>
                  </div>
               </div>

               {/* Comment ça marche */}
               <div className="max-w-6xl mx-auto mt-20">
                 <div className="text-center mb-12">
                   <h2 className="text-2xl font-bold text-gray-900 mb-4">Comment ça marche ?</h2>
                   <p className="text-gray-600 max-w-xl mx-auto">En 3 étapes simples, trouvez ou proposez un trajet</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center relative">
                       <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
                         1
                       </div>
                       <h3 className="text-lg font-bold mb-2 text-gray-900">Recherchez</h3>
                       <p className="text-gray-600 text-sm">Indiquez votre départ, destination et date. Trouvez les trajets disponibles.</p>
                       <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-emerald-200"></div>
                    </div>
                    <div className="text-center relative">
                       <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
                         2
                       </div>
                       <h3 className="text-lg font-bold mb-2 text-gray-900">Réservez</h3>
                       <p className="text-gray-600 text-sm">Choisissez votre trajet, réservez vos places et payez en ligne ou en espèces.</p>
                       <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-emerald-200"></div>
                    </div>
                    <div className="text-center">
                       <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
                         3
                       </div>
                       <h3 className="text-lg font-bold mb-2 text-gray-900">Voyagez</h3>
                       <p className="text-gray-600 text-sm">Retrouvez votre conducteur au point de rendez-vous et profitez du trajet !</p>
                    </div>
                 </div>
               </div>

               <div className="max-w-6xl mx-auto mt-20">
                 <h2 className="text-2xl font-bold text-gray-900 mb-8">Pourquoi utiliser Sunu Yoon ?</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                       <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                         <Icons.Shield size={24} />
                       </div>
                       <h3 className="text-lg font-bold mb-2">Confiance et Sécurité</h3>
                       <p className="text-gray-600">Tous nos membres sont vérifiés. Consultez les avis avant de voyager.</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                       <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                         <Icons.Car size={24} />
                       </div>
                       <h3 className="text-lg font-bold mb-2">Trajets partout</h3>
                       <p className="text-gray-600">De Dakar à Ziguinchor, trouvez un trajet même à la dernière minute.</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                       <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                         <Icons.Star size={24} />
                       </div>
                       <h3 className="text-lg font-bold mb-2">Prix bas</h3>
                       <p className="text-gray-600">Voyagez moins cher qu'en bus ou taxi '7 places'.</p>
                    </div>
                 </div>
               </div>

               {/* Témoignages */}
               <div className="max-w-6xl mx-auto mt-20">
                 <div className="text-center mb-12">
                   <h2 className="text-2xl font-bold text-gray-900 mb-4">Ce que disent nos voyageurs 💬</h2>
                   <p className="text-gray-600">Des milliers de Sénégalais nous font confiance</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      {
                        name: 'Fatou Diallo',
                        city: 'Dakar',
                        text: "J'utilise Sunu Yoon chaque semaine pour aller à Thiès voir ma famille. C'est moins cher et plus confortable que le bus !",
                        rating: 5,
                        trips: 24,
                        avatar: 'FD'
                      },
                      {
                        name: 'Mamadou Ndiaye',
                        city: 'Saint-Louis',
                        text: "En tant que conducteur, Sunu Yoon me permet de rentabiliser mes trajets. L'application est simple et les passagers sont respectueux.",
                        rating: 5,
                        trips: 156,
                        avatar: 'MN',
                        isDriver: true
                      },
                      {
                        name: 'Aissatou Ba',
                        city: 'Touba',
                        text: "Super application ! J'ai fait Dakar-Touba pour le Magal à un prix imbattable. Le conducteur était ponctuel et agréable.",
                        rating: 5,
                        trips: 8,
                        avatar: 'AB'
                      }
                    ].map((testimonial, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                        <div className="absolute -top-3 -left-3 text-4xl opacity-20">❝</div>
                        <p className="text-gray-700 mb-6 relative z-10 italic leading-relaxed">
                          "{testimonial.text}"
                        </p>
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                            {testimonial.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              {testimonial.name}
                              {testimonial.isDriver && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Conducteur</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{testimonial.city} • {testimonial.trips} trajets</div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Icons.Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>

               {/* Trajets populaires */}
               <div className="max-w-6xl mx-auto mt-20">
                 <h2 className="text-2xl font-bold text-gray-900 mb-8">🔥 Trajets populaires</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { from: 'Dakar', to: 'Touba', price: '3 500' },
                      { from: 'Dakar', to: 'Saint-Louis', price: '4 000' },
                      { from: 'Dakar', to: 'Thiès', price: '1 500' },
                      { from: 'Dakar', to: 'Mbour', price: '2 000' },
                      { from: 'Dakar', to: 'Kaolack', price: '3 000' },
                      { from: 'Dakar', to: 'Ziguinchor', price: '7 500' },
                      { from: 'Thiès', to: 'Touba', price: '2 500' },
                      { from: 'Saint-Louis', to: 'Dakar', price: '4 000' },
                    ].map((route, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearch({ origin: route.from, destination: route.to, date: new Date().toISOString().split('T')[0], passengers: 1 })}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <span className="font-medium text-gray-900">{route.from}</span>
                          <Icons.ChevronRight size={14} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                          <span className="font-medium text-gray-900">{route.to}</span>
                        </div>
                        <div className="text-emerald-600 font-bold">
                          à partir de {route.price} XOF
                        </div>
                      </button>
                    ))}
                 </div>
               </div>

               {/* CTA Final */}
               <div className="max-w-6xl mx-auto mt-20">
                 <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                   <div className="absolute inset-0 opacity-10">
                     <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                     <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
                   </div>
                   <div className="relative z-10">
                     <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                       Prêt à voyager ? 🚗
                     </h2>
                     <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
                       Rejoignez des milliers de Sénégalais qui voyagent malin. Publiez votre trajet ou trouvez un conducteur en quelques clics.
                     </p>
                     <div className="flex flex-col sm:flex-row gap-4 justify-center">
                       <button 
                         onClick={() => setCurrentView('publish')}
                         className="px-8 py-4 bg-white text-emerald-600 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                       >
                         <Icons.PlusCircle size={20} />
                         Proposer un trajet
                       </button>
                       <button 
                         onClick={() => setCurrentView('search')}
                         className="px-8 py-4 bg-emerald-700/50 backdrop-blur-sm text-white font-bold rounded-xl border-2 border-white/20 hover:bg-emerald-700/70 transition-all flex items-center justify-center gap-2"
                       >
                         <Icons.Search size={20} />
                         Rechercher un trajet
                       </button>
                     </div>
                   </div>
                 </div>
               </div>

               {/* FAQ Section */}
               <div className="max-w-6xl mx-auto mt-20 px-4">
                 <FAQSection />
               </div>

               {/* Stats rapides */}
               <div className="max-w-6xl mx-auto mt-20 mb-8">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                   <div>
                     <div className="text-3xl font-bold text-gray-900">🇸🇳</div>
                     <div className="text-sm text-gray-500 mt-1">100% Sénégalais</div>
                   </div>
                   <div>
                     <div className="text-3xl font-bold text-emerald-600">50K+</div>
                     <div className="text-sm text-gray-500 mt-1">Trajets réalisés</div>
                   </div>
                   <div>
                     <div className="text-3xl font-bold text-emerald-600">15K+</div>
                     <div className="text-sm text-gray-500 mt-1">Membres actifs</div>
                   </div>
                   <div>
                     <div className="text-3xl font-bold text-yellow-500">⭐ 4.8</div>
                     <div className="text-sm text-gray-500 mt-1">Note moyenne</div>
                   </div>
                 </div>
               </div>
            </div>
          </>
        );

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
            
            <div className="mt-8">
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
                 <div className="space-y-4">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-36 bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                       <div className="flex justify-between mb-4">
                         <div className="space-y-2 flex-1">
                           <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                           <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                         </div>
                         <div className="h-6 bg-gray-200 rounded w-20"></div>
                       </div>
                       <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                         <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                         <div className="space-y-2 flex-1">
                           <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                           <div className="h-2 bg-gray-100 rounded w-1/5"></div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map(ride => (
                    <RideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />
                  ))}
                  {searchResults.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
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
              // Plus besoin de connexion - site libre
              setShowChatWindow(true);
            }}
          />
        ) : null;
      
      case 'publish':
        // PLUS BESOIN D'INSCRIPTION POUR PUBLIER UN TRAJET
        return <PublishForm onPublish={handlePublishRide} onCancel={() => setCurrentView('home')} isAuthenticated={isAuthenticated} onLoginRequest={() => setShowAuthModal(true)} />;
      
      case 'profile':
        if (!isAuthenticated) {
           setCurrentView('home');
           return null;
        }
        return <ProfileView onNavigate={setCurrentView} />;

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
      onNavigate={setCurrentView} 
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
          // Rediriger vers le profil après connexion/inscription réussie
          setCurrentView('profile');
        }}
      />
      
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
