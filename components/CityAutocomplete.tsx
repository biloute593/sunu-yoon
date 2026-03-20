import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { SENEGAL_CITIES } from '../utils/cities';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  required?: boolean;
  label?: string;
}

const CityAutocomplete: React.FC<CityAutocompleteProps> = ({ value, onChange, placeholder, icon, rightElement, required, label }) => {
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
              className={`w-full px-4 py-2.5 text-left hover:bg-emerald-50 flex items-center gap-2 transition-all duration-150 ${index === focusedIndex ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
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

/** Simplified variant used in PublishForm (just MapPin icon, no extras) */
export const PublishCityInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <CityAutocomplete
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    icon={<Icons.MapPin size={20} />}
  />
);

export default CityAutocomplete;
