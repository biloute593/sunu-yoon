import React, { useState, useEffect } from 'react';
import { bookingService } from '../services/bookingService';
import { Icons } from './Icons';
import { useAuth } from '../contexts/AuthContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  price: number;
  currency?: string;
  seats?: number;
  origin: string;
  destination: string;
  departureTime: string;
  driverName: string;
  onSuccess: (bookingId: string) => void;
}

type BookingStep = 'seats' | 'processing' | 'success' | 'error';

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  rideId,
  price,
  currency = 'XOF',
  seats = 1,
  origin,
  destination,
  departureTime,
  driverName,
  onSuccess
}) => {
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<BookingStep>('seats');
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');

  // Pré-remplir si connecté
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      setPassengerName(user.name || `${user.firstName} ${user.lastName || ''}`.trim());
      setPassengerPhone(user.phone || '');
    }
  }, [isAuthenticated, user, isOpen]);

  const [passengerLocation, setPassengerLocation] = useState('');
  const [contactPreference, setContactPreference] = useState<'call' | 'whatsapp' | 'sms'>('call');
  const [notes, setNotes] = useState('');
  const [driverContact, setDriverContact] = useState<{ name: string; phone?: string | null; email?: string | null } | null>(null);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const totalPrice = price * selectedSeats;

  const handleBooking = async () => {
    const name = passengerName.trim();
    const phone = passengerPhone.trim();

    if (!name || name.length < 2) {
      setFormError('Merci de renseigner votre nom complet (minimum 2 caractères).');
      return;
    }

    const phoneRegex = /^(\+221|00221)?[7][0-9]{8}$/;
    if (!phone || !phoneRegex.test(phone)) {
      setFormError('Numéro invalide. Utilisez un numéro sénégalais (ex: 771234567).');
      return;
    }

    setFormError('');
    setIsLoading(true);
    setError('');
    setStep('processing');

    try {
      const booking = await bookingService.createBooking({
        rideId,
        seats: selectedSeats,
        passengerName,
        passengerPhone,
        paymentMethod: 'CASH', // Default to CASH as we removed payment selection
        contactPreference,
        notes: `${notes} ${passengerLocation ? `\nLocalisation: ${passengerLocation}` : ''}`
      });

      setBookingId(booking.id);
      setDriverContact(booking.ride.driver);
      setStep('success');
      onSuccess(booking.id);

    } catch (err: any) {
      console.error('Erreur réservation:', err);
      const apiMessage = err?.response?.data?.error;

      let errorMessage = 'Erreur lors de la réservation';
      if (apiMessage) {
        errorMessage = apiMessage;
      } else if (err?.message?.includes('fetch')) {
        errorMessage = 'Connexion impossible. Vérifiez votre connexion internet.';
      } else if (err?.message?.includes('Network')) {
        errorMessage = 'Erreur réseau. Veuillez réessayer.';
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep('seats');
    setSelectedSeats(1);
    setError('');
    setBookingId('');
    setPassengerName('');
    setPassengerPhone('');
    setPassengerLocation('');
    setContactPreference('call');
    setNotes('');
    setDriverContact(null);
    setFormError('');
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderSeatsSelection = () => (
    <div className="space-y-6">
      {/* Résumé du trajet */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <Icons.Car className="text-emerald-600" size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{origin} → {destination}</p>
            <p className="text-sm text-gray-500">{formatDate(departureTime)}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">Conducteur: <span className="font-medium">{driverName}</span></p>
      </div>

      {/* Sélection places */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Nombre de places</label>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setSelectedSeats(Math.max(1, selectedSeats - 1))}
            className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold"
          >
            -
          </button>
          <span className="text-3xl font-bold text-emerald-600 w-16 text-center">{selectedSeats}</span>
          <button
            onClick={() => setSelectedSeats(Math.min(seats, selectedSeats + 1))}
            className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold"
          >
            +
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">{seats} place(s) disponible(s)</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Votre nom complet*</label>
          <input
            type="text"
            value={passengerName}
            onChange={(e) => setPassengerName(e.target.value)}
            placeholder="Ex: Aissatou Ndiaye"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Téléphone / WhatsApp*</label>
          <input
            type="tel"
            value={passengerPhone}
            onChange={(e) => setPassengerPhone(e.target.value)}
            placeholder="Ex: 77 123 45 67"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Votre localisation (Facultatif)</label>
          <input
            type="text"
            value={passengerLocation}
            onChange={(e) => setPassengerLocation(e.target.value)}
            placeholder="Ex: Rond-point Liberté 6"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Préférence de contact</label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'call', label: 'Appel' },
              { key: 'whatsapp', label: 'WhatsApp' },
              { key: 'sms', label: 'SMS' }
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setContactPreference(option.key as 'call' | 'whatsapp' | 'sms')}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${contactPreference === option.key
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Message pour le conducteur (optionnel)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Point de rendez-vous, bagages, etc."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-24"
          />
        </div>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          {formError}
        </div>
      )}

      {/* Prix total */}
      <div className="bg-emerald-50 rounded-xl p-4 flex justify-between items-center">
        <span className="text-gray-700 font-medium">Total à payer (au départ)</span>
        <span className="text-2xl font-bold text-emerald-600">
          {totalPrice.toLocaleString('fr-FR')} {currency}
        </span>
      </div>

      <button
        onClick={handleBooking}
        disabled={isLoading}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'Valider la réservation'
        )}
      </button>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 relative">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Nous contactons le conducteur...</h3>
      <p className="text-gray-600">Votre demande est en cours d'envoi. Cela ne prend que quelques secondes.</p>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icons.CheckCircle className="text-emerald-600" size={48} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée !</h3>
      <p className="text-gray-600 mb-6">
        Le conducteur {driverContact?.name || driverName} reçoit vos coordonnées et vous contactera rapidement pour finaliser le trajet.
      </p>

      <div className="bg-white border border-gray-100 rounded-xl p-4 text-left mb-6">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-gray-500">Référence</span>
          <span className="font-mono font-bold text-gray-900">{bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Places demandées</span>
          <span className="font-bold text-gray-900">{selectedSeats}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Montant estimé</span>
          <span className="font-bold text-emerald-600">{totalPrice.toLocaleString('fr-FR')} {currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Contact préféré</span>
          <span className="font-semibold text-gray-800">
            {contactPreference === 'call' ? 'Appel' : contactPreference === 'whatsapp' ? 'WhatsApp' : 'SMS'}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
        <p className="text-sm text-gray-500 mb-2">Coordonnées du conducteur</p>
        <p className="text-base font-semibold text-gray-900 mb-2">{driverContact?.name || driverName}</p>
        {driverContact?.phone ? (
          <div className="flex flex-col gap-2">
            <a
              href={`tel:${driverContact.phone}`}
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <Icons.Phone size={16} /> Appeler: {driverContact.phone}
            </a>
            <a
              href={`https://wa.me/${driverContact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour! Je suis intéressé par votre trajet ${origin} → ${destination} le ${new Date(departureTime).toLocaleDateString('fr-FR')}. Réf: ${bookingId.slice(0, 8).toUpperCase()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1fbe59] text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-md"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Contacter sur WhatsApp
            </a>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Le conducteur vous contactera directement.</p>
        )}
      </div>

      <button
        onClick={resetAndClose}
        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
      >
        Fermer
      </button>
    </div>
  );

  const renderError = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icons.X className="text-red-600" size={48} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Erreur de réservation</h3>
      <p className="text-gray-600 mb-6">{error}</p>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('seats')}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
        >
          Réessayer
        </button>
        <button
          onClick={resetAndClose}
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step !== 'processing' ? resetAndClose : undefined}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] relative z-10 overflow-hidden animate-slide-up flex flex-col">
        {/* Header */}
        {step !== 'processing' && step !== 'success' && step !== 'error' && (
          <div className="p-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {step === 'seats' && 'Réserver ce trajet'}
              </h3>
              <button onClick={resetAndClose}>
                <Icons.X size={24} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'seats' && renderSeatsSelection()}
          {step === 'processing' && renderProcessing()}
          {step === 'success' && renderSuccess()}
          {step === 'error' && renderError()}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
