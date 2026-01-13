import React, { useState } from 'react';
import { Icons } from './Icons';
import { useAuth } from '../contexts/AuthContext';

interface PassengerRequestFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PassengerRequestForm: React.FC<PassengerRequestFormProps> = ({ onClose, onSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    originCity: '',
    destinationCity: '',
    departureDate: '',
    seats: 1,
    maxPricePerSeat: '',
    description: '',
    passengerName: user?.name || '',
    passengerPhone: ''
  });

  const SENEGAL_CITIES = [
    'Dakar', 'Thiès', 'Saint-Louis', 'Touba', 'Kaolack', 'Ziguinchor',
    'Rufisque', 'Mbour', 'Diourbel', 'Tambacounda', 'Kolda', 'Fatick',
    'Louga', 'Matam', 'Kédougou', 'Sédhiou', 'Pikine', 'Guédiawaye'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payload: any = {
        originCity: formData.originCity,
        destinationCity: formData.destinationCity,
        departureDate: new Date(formData.departureDate).toISOString(),
        seats: formData.seats,
        description: formData.description || undefined
      };

      if (formData.maxPricePerSeat) {
        payload.maxPricePerSeat = parseInt(formData.maxPricePerSeat);
      }

      // Si non authentifié, envoyer nom et téléphone
      if (!isAuthenticated) {
        if (!formData.passengerName || !formData.passengerPhone) {
          setError('Nom et téléphone requis');
          setIsSubmitting(false);
          return;
        }
        payload.passengerName = formData.passengerName;
        payload.passengerPhone = formData.passengerPhone;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'https://sunu-yoon-demo-2025.netlify.app/api';
      const response = await fetch(`${apiUrl}/ride-requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la publication');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating ride request:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 rounded-t-3xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Je cherche un trajet</h2>
            <p className="text-blue-100 text-sm">Un conducteur vous contactera</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition"
          >
            <Icons.X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Départ
              </label>
              <select
                required
                value={formData.originCity}
                onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choisir une ville</option>
                {SENEGAL_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination
              </label>
              <select
                required
                value={formData.destinationCity}
                onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choisir une ville</option>
                {SENEGAL_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de départ
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de places
              </label>
              <input
                type="number"
                required
                min="1"
                max="4"
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix maximum par place (optionnel)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="500"
                value={formData.maxPricePerSeat}
                onChange={(e) => setFormData({ ...formData, maxPricePerSeat: e.target.value })}
                placeholder="Ex: 5000"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">XOF</span>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre nom
                </label>
                <input
                  type="text"
                  required
                  value={formData.passengerName}
                  onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                  placeholder="Prénom Nom"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.passengerPhone}
                  onChange={(e) => setFormData({ ...formData, passengerPhone: e.target.value })}
                  placeholder="77 123 45 67"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Détails supplémentaires (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Heure préférée, point de rendez-vous, bagages..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Publication...' : 'Publier ma demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PassengerRequestForm;
