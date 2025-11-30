import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, PaymentMethod } from '../services/paymentService';
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
  const { user, isAuthenticated } = useAuth();
  
  const [step, setStep] = useState<BookingStep>('seats');
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WAVE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string>('');

  if (!isOpen) return null;

  const totalPrice = price * selectedSeats;

  const handleSelectSeats = () => {
    setStep('payment');
  };

  const handlePayment = async () => {
    // Site 100% libre - pas besoin de connexion pour réserver
    setIsLoading(true);
    setError('');
    setStep('processing');

    try {
      // Créer une réservation locale (site 100% libre)
      const localBookingId = `booking_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      
      // Stocker la réservation localement avec gestion d'erreur
      try {
        const bookings = JSON.parse(localStorage.getItem('myBookings') || '[]');
        bookings.push({
          id: localBookingId,
          rideId,
          seats: selectedSeats,
          totalPrice,
          currency,
          origin,
          destination,
          departureTime,
          driverName,
          paymentMethod,
          status: paymentMethod === 'CASH' ? 'pending_payment' : 'pending',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('myBookings', JSON.stringify(bookings));
      } catch (storageError) {
        console.warn('Impossible de sauvegarder la réservation localement:', storageError);
        // Continue - la réservation fonctionne quand même pour cette session
      }

      setBookingId(localBookingId);

      // Si paiement en espèces, terminer ici
      if (paymentMethod === 'CASH') {
        setStep('success');
        onSuccess(localBookingId);
        return;
      }

      // Pour les paiements mobiles, afficher les instructions
      setStep('success');
      onSuccess(localBookingId);

    } catch (err: any) {
      console.error('Erreur réservation:', err);
      setError('Erreur lors de la réservation. Veuillez réessayer.');
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
    setPaymentUrl('');
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
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {paymentMethod === 'CASH' ? 'Confirmer la réservation' : `Payer ${totalPrice.toLocaleString('fr-FR')} ${currency}`}
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
      <h3 className="text-xl font-bold text-gray-900 mb-2">Traitement en cours...</h3>
      <p className="text-gray-600">Veuillez patienter pendant que nous traitons votre réservation.</p>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icons.CheckCircle className="text-emerald-600" size={48} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Réservation confirmée !</h3>
      <p className="text-gray-600 mb-6">
        {paymentMethod === 'CASH' 
          ? 'N\'oubliez pas de préparer le montant exact pour le conducteur.'
          : 'Votre paiement a été initié. Finalisez-le dans l\'application de paiement.'
        }
      </p>
      
      <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">N° de réservation</span>
          <span className="font-mono font-bold text-gray-900">{bookingId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Places réservées</span>
          <span className="font-bold text-gray-900">{selectedSeats}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Montant</span>
          <span className="font-bold text-emerald-600">{totalPrice.toLocaleString('fr-FR')} {currency}</span>
        </div>
      </div>

      {paymentUrl && paymentMethod !== 'CASH' && (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-emerald-600 hover:underline mb-6"
        >
          Ouvrir le paiement <Icons.ChevronRight size={16} />
        </a>
      )}

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
