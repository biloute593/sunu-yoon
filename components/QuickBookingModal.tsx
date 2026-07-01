import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/apiClient';
import { Icons } from './Icons';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  price: number;
  currency?: string;
  seats?: number;
  origin: string;
  destination: string;
  departureTime: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string;
  driverPhone?: string;
  onSuccess: (driverId: string, driverName: string, driverAvatar?: string, autoMessage?: string) => void;
  mode?: 'booking' | 'chat';
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  rideId,
  price,
  currency = 'XOF',
  seats = 1,
  origin,
  destination,
  departureTime,
  driverId,
  driverName,
  driverAvatar,
  driverPhone,
  onSuccess,
  mode = 'booking'
}) => {
  const { user } = useAuth();
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pré-remplir si l'utilisateur est connecté
  useEffect(() => {
    if (user) {
      setPassengerName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '');
      setPassengerPhone(user.phone || '');
    }
  }, [user]);

  // Reset quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (!user) {
        setPassengerName('');
        setPassengerPhone('');
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleValidate = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const name = passengerName.trim() || 'Passager';

      // Si l'utilisateur n'est pas connecté, faire une connexion rapide silencieuse
      if (!user) {
        const res = await ApiClient.post<{ user: any; tokens: any }>('/auth/quick-login', {
          name,
          phone: passengerPhone.trim() || undefined
        });

        if (res.success && res.data) {
          // Stocker les tokens et l'utilisateur
          localStorage.setItem('sunu_yoon_access_token', res.data.tokens.accessToken);
          if (res.data.tokens.refreshToken) {
            localStorage.setItem('sunu_yoon_refresh_token', res.data.tokens.refreshToken);
          }
          localStorage.setItem('sunu_yoon_user', JSON.stringify(res.data.user));
          localStorage.setItem('sunu_yoon_auth_provider', 'backend');
        } else {
          // Même si le quick-login échoue, on continue en mode local
          console.warn('Quick login failed, continuing in local mode');
        }
      }

      // Si connecté au backend, créer la réservation obligatoirement pour pouvoir chatter
      const isBackend = localStorage.getItem('sunu_yoon_auth_provider') === 'backend' || !!localStorage.getItem('sunu_yoon_access_token');
      if (isBackend) {
        const bookRes = await ApiClient.post<{ booking: { id: string } }>('/bookings', {
          rideId,
          seats: 1
        });

        if (!bookRes.success) {
          const isAlreadyBooked = bookRes.error?.message?.toLowerCase().includes('déjà') ||
                                  bookRes.error?.message?.toLowerCase().includes('already') ||
                                  bookRes.message?.toLowerCase().includes('déjà') ||
                                  bookRes.message?.toLowerCase().includes('already');
          if (!isAlreadyBooked) {
            throw new Error(bookRes.error?.message || bookRes.message || 'Impossible de créer la réservation.');
          }
        }
      }

      // Créer le message automatique de réservation
      const autoMessage = mode === 'booking' 
        ? `📋 ${name} a réservé ce trajet ${origin} → ${destination} (${formatDate(departureTime)}).\n\nSi vous acceptez, appuyez sur OUI. Sinon, appuyez sur NON.`
        : `👋 Bonjour, je suis intéressé par votre trajet ${origin} → ${destination}.`;

      // Ouvrir directement le chat avec le chauffeur
      onSuccess(driverId, driverName, driverAvatar, autoMessage);
      onClose();

    } catch (err: any) {
      console.error('Erreur réservation:', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de la connexion au serveur. Veuillez réessayer.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-slide-up p-6 border border-gray-100">

        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
          <Icons.X size={20} />
        </button>

        <div className="space-y-5">
          {/* Header */}
          <div className="text-center">
            <span className="text-3xl">{mode === 'booking' ? '🚖' : '💬'}</span>
            <h3 className="text-xl font-bold text-gray-900 mt-2">
              {mode === 'booking' ? 'Réserver ce trajet' : 'Contacter le conducteur'}
            </h3>
          </div>

          {/* Résumé du trajet */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium text-gray-900">{origin}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-gray-800"></div>
              <span className="text-sm font-medium text-gray-900">{destination}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-100/50">
              <span className="text-xs text-gray-500">{formatDate(departureTime)}</span>
              <span className="text-lg font-extrabold text-emerald-600">{price.toLocaleString('fr-FR')} {currency}</span>
            </div>
          </div>

          {/* Chauffeur */}
          <div className="flex items-center gap-3">
            {driverAvatar ? (
              <img src={driverAvatar} alt={driverName} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Icons.User className="text-emerald-600" size={20} />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 text-sm">{driverName}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span>Chauffeur</span>
                {driverPhone && (
                  <>
                    <span>•</span>
                    <a
                      href={`tel:${driverPhone}`}
                      className="flex items-center gap-1 text-emerald-600 font-bold hover:underline"
                    >
                      <Icons.Phone size={10} /> {driverPhone}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Champs (optionnels) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Votre nom <span className="text-gray-400">(optionnel)</span></label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="Ex: Fatou"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Votre téléphone <span className="text-gray-400">(optionnel)</span></label>
              <input
                type="tel"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                placeholder="Ex: 77 123 45 67"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm transition-all"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl p-3 text-center font-medium">
              {errorMessage}
            </div>
          )}

          {/* Bouton Valider */}
          <button
            onClick={handleValidate}
            disabled={isLoading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-base active:scale-95"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Validation...</span>
              </div>
            ) : (
              <>
                <Icons.Check size={20} />
                <span>{mode === 'booking' ? 'Valider' : 'Démarrer le chat'}</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 text-center">
            En validant, vous serez mis en contact direct avec le chauffeur
          </p>
        </div>

      </div>
    </div>
  );
};
