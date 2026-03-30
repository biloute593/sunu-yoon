import React, { useState, useRef } from 'react';
import { Icons } from './Icons';

// Liste des villes principales du Sénégal pour l'autocomplétion
export const SENEGAL_CITIES = [
  'Dakar', 'Thiès', 'Saint-Louis', 'Touba', 'Kaolack', 'Ziguinchor',
  'Rufisque', 'Mbour', 'Diourbel', 'Tambacounda', 'Kolda', 'Fatick',
  'Louga', 'Matam', 'Kédougou', 'Sédhiou', 'Pikine', 'Guédiawaye',
  'Saly', 'Somone', 'Joal-Fadiouth', 'Richard Toll', 'Podor', 'Vélingara',
  'Bignona', 'Oussouye', 'Cap Skirring', 'Kafountine', 'Palmarin'
];

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  required?: boolean;
  label?: string;
}

const CityAutocomplete: React.FC<CityAutocompleteProps> = ({ 
  value, onChange, placeholder, icon, rightElement, required, label 
}) => {
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
    <div className="relative w-full group">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 1 && setShowSuggestions(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          required={required}
          className={`w-full ${icon ? 'pl-11' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'} py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder:text-gray-400`}
        />
        {rightElement && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
          {suggestions.map((city, index) => (
            <button
              key={city}
              type="button"
              onClick={() => handleSuggestionClick(city)}
              className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${index === focusedIndex ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50 text-gray-700'
                }`}
            >
              <div className="flex items-center gap-3">
                <Icons.MapPin size={18} className={index === focusedIndex ? 'text-emerald-500' : 'text-gray-400'} />
                <span className="font-medium">{city}</span>
              </div>
              <Icons.ChevronRight size={14} className="text-gray-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CityAutocomplete;
