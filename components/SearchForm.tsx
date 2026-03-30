import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import CityAutocomplete, { SENEGAL_CITIES } from './CityAutocomplete';
import { LocationState, SearchParams } from '../types';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  initialValues?: SearchParams;
  onLocate: () => void;
  userLocation: LocationState;
}

const SearchForm: React.FC<SearchFormProps> = ({ 
  onSearch, isLoading, initialValues, onLocate, userLocation 
}) => {
  const [from, setFrom] = useState(initialValues?.origin || '');
  const [to, setTo] = useState(initialValues?.destination || '');
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().split('T')[0]);
  const [passengers, setPassengers] = useState(initialValues?.passengers || 1);

  useEffect(() => {
    if (userLocation.coords && userLocation.address && !from && !initialValues?.origin) {
      // Extraire le nom de la ville de l'adresse
      const cityMatch = userLocation.address.split(',')[0];
      if (cityMatch && SENEGAL_CITIES.some(c => userLocation.address.includes(c))) {
        setFrom(cityMatch);
      }
    }
  }, [userLocation.address, userLocation.coords, initialValues?.origin]);

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
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-xl w-full max-w-4xl mx-auto relative z-10 border border-gray-100">
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
              className={`p-1.5 rounded-full transition-colors ${userLocation.loading
                ? 'animate-spin text-emerald-600'
                : userLocation.coords
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100'
                }`}
            >
              {userLocation.loading ? (
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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

export default SearchForm;
