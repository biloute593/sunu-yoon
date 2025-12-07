import React, { useState } from 'react';
import { PaymentMethod } from '../services/paymentService';
import { bookingService } from '../services/bookingService';
import { Icons } from './Icons';

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

type BookingStep = 'seats' | 'payment' | 'processing' | 'success' | 'error';

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
  const [step, setStep] = useState<BookingStep>('seats');
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WAVE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [contactPreference, setContactPreference] = useState<'call' | 'whatsapp' | 'sms'>('call');
  const [notes, setNotes] = useState('');
  const [driverContact, setDriverContact] = useState<{ name: string; phone?: string | null; email?: string | null } | null>(null);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const totalPrice = price * selectedSeats;

  const handleSelectSeats = () => {
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
    setStep('payment');
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setError('');
    setStep('processing');

    try {
      const booking = await bookingService.createBooking({
        rideId,
        seats: selectedSeats,
        passengerName,
        passengerPhone,
        paymentMethod,
        contactPreference,
        notes
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
    setPaymentMethod('WAVE');
    setError('');
    setBookingId('');
    setPassengerName('');
    setPassengerPhone('');
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
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    contactPreference === option.key
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
          <span className="text-gray-700 font-medium">Total à payer</span>
          <span className="text-2xl font-bold text-emerald-600">
            {totalPrice.toLocaleString('fr-FR')} {currency}
          </span>
        </div>

      <button
        onClick={handleSelectSeats}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all"
      >
        Continuer vers le paiement
      </button>
    </div>
  );

  const renderPaymentSelection = () => (
    <div className="space-y-6">
      <button
        onClick={() => setStep('seats')}
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
      >
        <Icons.ChevronRight className="rotate-180" size={16} />
        Retour
      </button>

      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">Montant à payer</p>
        <p className="text-3xl font-bold text-gray-900">{totalPrice.toLocaleString('fr-FR')} {currency}</p>
      </div>

      <div className="space-y-3">
        {/* Wave */}
        <div
          onClick={() => setPaymentMethod('WAVE')}
          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
            paymentMethod === 'WAVE' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Icons.Smartphone className="text-blue-600" size={24} />
            </div>
            <div>
              <span className="font-bold text-gray-900 block">Wave</span>
              <span className="text-xs text-gray-500">Paiement instantané</span>
            </div>
          </div>
          {paymentMethod === 'WAVE' && <Icons.CheckCircle className="text-blue-500" size={24} />}
        </div>

        {/* Orange Money */}
        <div
          onClick={() => setPaymentMethod('ORANGE_MONEY')}
          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
            paymentMethod === 'ORANGE_MONEY' 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Icons.Wallet className="text-orange-600" size={24} />
            </div>
            <div>
              <span className="font-bold text-gray-900 block">Orange Money</span>
              <span className="text-xs text-gray-500">Paiement mobile</span>
            </div>
          </div>
          {paymentMethod === 'ORANGE_MONEY' && <Icons.CheckCircle className="text-orange-500" size={24} />}
        </div>

        {/* Espèces */}
        <div
          onClick={() => setPaymentMethod('CASH')}
          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
            paymentMethod === 'CASH' 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Icons.CreditCard className="text-emerald-600" size={24} />
            </div>
            <div>
              <span className="font-bold text-gray-900 block">Espèces au départ</span>
              <span className="text-xs text-gray-500">Payer au conducteur</span>
            </div>
          </div>
          {paymentMethod === 'CASH' && <Icons.CheckCircle className="text-emerald-500" size={24} />}
        </div>
      </div>

      <button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'Envoyer ma demande au conducteur'
        )}
      </button>

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
        <Icons.Shield size={12} />
        Paiement sécurisé
      </p>
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
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Mode de paiement prévu</span>
          <span className="font-semibold text-gray-800">{paymentMethod === 'CASH' ? 'Espèces' : paymentMethod === 'WAVE' ? 'Wave' : 'Orange Money'}</span>
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
        <p className="text-base font-semibold text-gray-900">{driverContact?.name || driverName}</p>
        {driverContact?.phone ? (
          <a
            href={`tel:${driverContact.phone}`}
            className="inline-flex items-center gap-2 text-emerald-600 mt-1"
          >
            <Icons.Smartphone size={16} /> {driverContact.phone}
          </a>
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
          onClick={() => setStep('payment')}
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-slide-up">
        {/* Header */}
        {step !== 'processing' && step !== 'success' && step !== 'error' && (
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {step === 'seats' && 'Réserver ce trajet'}
                {step === 'payment' && 'Mode de paiement'}
              </h3>
              <button onClick={resetAndClose}>
                <Icons.X size={24} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {step === 'seats' && renderSeatsSelection()}
          {step === 'payment' && renderPaymentSelection()}
          {step === 'processing' && renderProcessing()}
          {step === 'success' && renderSuccess()}
          {step === 'error' && renderError()}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
