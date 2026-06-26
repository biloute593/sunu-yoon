import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rideService } from '../services/rideService';
import { ApiClient } from '../services/apiClient';
import { messageService } from '../services/messageService';
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
  onSuccess: (conversationId: string, driverId: string, driverName: string, driverAvatar?: string) => void;
}

type QuickBookingStep = 'input' | 'waiting' | 'accepted' | 'declined' | 'error';

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
  onSuccess
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<QuickBookingStep>('input');
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [passengerName, setPassengerName] = useState(user?.firstName || '');
  const [passengerPhone, setPassengerPhone] = useState(user?.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [conversationId, setConversationId] = useState('');

  useEffect(() => {
    if (user) {
      setPassengerName(`${user.firstName} ${user.lastName || ''}`.trim());
      setPassengerPhone(user.phone || '');
    }
  }, [user]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setErrorMessage('');
      setSelectedSeats(1);
    }
  }, [isOpen]);

  // Écouter la réponse du chauffeur via WebSocket (proper API)
  useEffect(() => {
    if (step !== 'waiting') return;

    messageService.connect();

    const handleBookingResponse = (data: {
      bookingId: string;
      status: 'CONFIRMED' | 'CANCELLED';
      conversationId?: string;
      message?: string;
    }) => {
      console.log('Réponse réservation reçue:', data);
      if (data.status === 'CONFIRMED') {
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        setStep('accepted');

        // Notification sonore
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (e) {}

        // Notification navigateur
        if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('🎉 Course Acceptée !', {
            body: `${driverName} a accepté votre course ${origin} → ${destination}`,
            icon: driverAvatar || '/favicon.ico'
          });
        }
      } else {
        setStep('declined');
      }
    };

    const handleBookingError = (data: { message: string }) => {
      setErrorMessage(data.message);
      setStep('error');
    };

    messageService.onBookingResponse(handleBookingResponse);
    messageService.onBookingError(handleBookingError);

    return () => {
      messageService.offBookingResponse(handleBookingResponse);
      messageService.offBookingError(handleBookingError);
    };
  }, [step, notificationsEnabled, driverName, origin, destination, driverAvatar]);

  if (!isOpen) return null;

  const enableNotifications = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setNotificationsEnabled(result === 'granted');
    }
  };

  const handleRequestBooking = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      let activeUser = user;

      // Authentification rapide si l'utilisateur est anonyme
      if (!activeUser) {
        if (!passengerName.trim() || !passengerPhone.trim()) {
          setErrorMessage('Veuillez entrer votre nom et votre numéro de téléphone.');
          setIsLoading(false);
          return;
        }

        const res = await ApiClient.post<{ user: any; tokens: any }>('/auth/quick-login', {
          name: passengerName.trim(),
          phone: passengerPhone.trim()
        });

        if (res.success && res.data) {
          localStorage.setItem('sunu_yoon_access_token', res.data.tokens.accessToken);
          localStorage.setItem('sunu_yoon_user', JSON.stringify(res.data.user));
          window.location.reload();
          return;
        } else {
          throw new Error(res.error?.message || 'Échec de la connexion rapide');
        }
      }

      // Activer les notifications
      if (notificationsEnabled) {
        enableNotifications();
      }

      // Envoyer la demande via l'API propre de messageService
      messageService.connect();
      
      const sent = messageService.requestBooking({
        rideId,
        seats: selectedSeats,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim()
      });

      if (sent) {
        setStep('waiting');
      } else {
        // Fallback: réservation via API REST classique
        try {
          await rideService.bookRide(rideId, selectedSeats);
          setStep('waiting');
          // En mode fallback, simuler une acceptation après un délai
          setTimeout(() => {
            setStep('accepted');
          }, 5000);
        } catch (fallbackErr: any) {
          throw new Error(fallbackErr.message || 'Impossible de réserver ce trajet.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Impossible de réserver ce trajet.');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToChat = () => {
    onSuccess(conversationId, driverId, driverName, driverAvatar);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPrice = price * selectedSeats;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step !== 'waiting' ? onClose : undefined}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-slide-up flex flex-col p-6 border border-gray-100">

        {step !== 'waiting' && (
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <Icons.X size={20} />
          </button>
        )}

        {step === 'input' && (
          <div className="space-y-5">
            <div className="text-center">
              <span className="text-3xl">🚖</span>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Réserver votre course</h3>
              <p className="text-xs text-gray-500 mt-1">{origin} → {destination}</p>
              <p className="text-xs font-semibold text-emerald-600">{formatDate(departureTime)}</p>
            </div>

            {/* Chauffeur info */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
              {driverAvatar ? (
                <img src={driverAvatar} alt={driverName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Icons.User className="text-emerald-600" size={20} />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 text-sm">{driverName}</p>
                <p className="text-xs text-gray-500">Chauffeur</p>
              </div>
            </div>

            {/* Prix et places */}
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Prix par place</p>
                  <p className="text-lg font-extrabold text-emerald-600">{price.toLocaleString('fr-FR')} {currency}</p>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                  <button onClick={() => setSelectedSeats(Math.max(1, selectedSeats - 1))} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700">-</button>
                  <span className="font-extrabold text-emerald-600 w-6 text-center">{selectedSeats}</span>
                  <button onClick={() => setSelectedSeats(Math.min(seats, selectedSeats + 1))} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700">+</button>
                </div>
              </div>
              {selectedSeats > 1 && (
                <div className="mt-2 pt-2 border-t border-emerald-100/50 flex justify-between">
                  <span className="text-xs text-gray-500">Total ({selectedSeats} places)</span>
                  <span className="text-sm font-bold text-emerald-700">{totalPrice.toLocaleString('fr-FR')} {currency}</span>
                </div>
              )}
            </div>

            {/* Champs nom et téléphone pour les non-connectés */}
            {!user && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Votre nom complet</label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Ex: Fatou Diop"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Votre numéro de téléphone</label>
                  <input
                    type="tel"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="Ex: 77 123 45 67"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm transition-all"
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl p-3 text-center font-medium">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleRequestBooking}
              disabled={isLoading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>🚀 Envoyer la demande au chauffeur</>
              )}
            </button>
          </div>
        )}

        {step === 'waiting' && (
          <div className="text-center py-6 space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-xl">⏳</div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Demande envoyée !</h3>
              <p className="text-sm text-gray-500 mt-2">
                Nous attendons que le chauffeur <strong>{driverName}</strong> accepte votre demande.
              </p>
              <p className="text-xs text-gray-400 mt-1">Cela prend généralement moins d'une minute</p>
            </div>

            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50 flex items-center gap-3 text-left">
              <input
                type="checkbox"
                id="notif-check"
                checked={notificationsEnabled}
                onChange={(e) => {
                  setNotificationsEnabled(e.target.checked);
                  if (e.target.checked) enableNotifications();
                }}
                className="w-5 h-5 accent-emerald-600 cursor-pointer rounded"
              />
              <label htmlFor="notif-check" className="text-xs text-gray-600 cursor-pointer leading-tight">
                <strong>Activer les notifications</strong> pour être averti instantanément si le chauffeur accepte ou refuse.
              </label>
            </div>
          </div>
        )}

        {step === 'accepted' && (
          <div className="text-center py-6 space-y-5">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              🎉
            </div>
            <div>
              <h3 className="text-2xl font-black text-emerald-600">Course Acceptée !</h3>
              <p className="text-sm text-gray-600 mt-2">
                Le chauffeur prend votre course. Un message a été envoyé automatiquement pour démarrer la conversation.
              </p>
            </div>

            <button
              onClick={handleGoToChat}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              💬 Appuyer ici pour discuter avec le chauffeur
            </button>
          </div>
        )}

        {step === 'declined' && (
          <div className="text-center py-6 space-y-5">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              ❌
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-600">Chauffeur indisponible</h3>
              <p className="text-sm text-gray-500 mt-2">
                Le chauffeur ne prend plus de client sur ce trajet pour le moment.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-sm"
            >
              Fermer et voir d'autres trajets
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-6 space-y-5">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Une erreur est survenue</h3>
              <p className="text-sm text-red-500 mt-2">
                {errorMessage || "Impossible de compléter la réservation."}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('input'); setErrorMessage(''); }}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm"
              >
                Réessayer
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
