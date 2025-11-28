import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import CookieBanner from './components/CookieBanner';
import Map from './components/Map';
import { Icons } from './components/Icons';
import { searchRides } from './services/api';
import { Ride, SearchParams, LocationState, Coordinates, User, DraftRide } from './types';

// --- MOCK DATA ---
const MOCK_USER: User = {
  id: 'u1',
  name: 'Amadou Sow',
  avatarUrl: 'https://picsum.photos/seed/amadou/100/100',
  rating: 4.5,
  reviewCount: 12,
  isVerified: true
};

// --- COMPONENTS ---

const LoginModal: React.FC<{ isOpen: boolean, onClose: () => void, onLogin: () => void }> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      onLogin();
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-slide-up">
        <div className="bg-emerald-600 p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Bienvenue sur Sunu Yoon</h2>
          <p className="text-emerald-100 text-sm">Connectez-vous pour publier des trajets</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email ou Téléphone</label>
              <div className="relative">
                <Icons.User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  defaultValue="demo@sunuyoon.sn"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <Icons.Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  defaultValue="password"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg transition-transform active:scale-95"
            >
              Se connecter
            </button>
            <div className="text-center text-sm text-gray-500 mt-4">
              Pas encore de compte ? <a href="#" className="text-emerald-600 font-bold hover:underline">S'inscrire</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const PaymentModal: React.FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => void, price: number }> = ({ isOpen, onClose, onConfirm, price }) => {
  const [method, setMethod] = useState<'wave' | 'om' | 'cash'>('wave');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayment = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onConfirm();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-gray-900">Paiement</h3>
            <button onClick={onClose}><Icons.X size={24} className="text-gray-400 hover:text-gray-600" /></button>
          </div>
          <p className="text-sm text-gray-500">Choisissez votre mode de paiement sécurisé</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div 
            onClick={() => setMethod('wave')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'wave' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Icons.Smartphone size={20} />
              </div>
              <span className="font-bold text-gray-900">Wave</span>
            </div>
            {method === 'wave' && <Icons.CheckCircle className="text-blue-500" />}
          </div>

          <div 
            onClick={() => setMethod('om')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'om' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                <Icons.Wallet size={20} />
              </div>
              <span className="font-bold text-gray-900">Orange Money</span>
            </div>
            {method === 'om' && <Icons.CheckCircle className="text-orange-500" />}
          </div>

          <div 
            onClick={() => setMethod('cash')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'cash' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <Icons.CreditCard size={20} />
              </div>
              <span className="font-bold text-gray-900">Espèces au départ</span>
            </div>
            {method === 'cash' && <Icons.CheckCircle className="text-emerald-500" />}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
             <span className="text-gray-600">Total à payer</span>
             <span className="text-2xl font-bold text-gray-900">{price.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <button 
            onClick={handlePayment}
            disabled={processing}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Traitement...
              </>
            ) : (
              `Payer ${price.toLocaleString('fr-FR')} FCFA`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileView: React.FC<{ user: User, bookings: Ride[], announcements: Ride[], onNavigate: (v: string) => void }> = ({ user, bookings, announcements, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'announcements'>('bookings');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
         <div className="relative">
            <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md" />
            <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white">
              <Icons.CheckCircle size={16} />
            </div>
         </div>
         <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500 mb-4">
              <Icons.Star className="text-yellow-400 fill-yellow-400" size={16} />
              <span className="font-semibold text-gray-900">{user.rating}</span>
              <span>•</span>
              <span>{user.reviewCount} avis</span>
              <span>•</span>
              <span className="text-emerald-600 font-medium">Membre vérifié</span>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                <Icons.Settings size={16} />
                Paramètres
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                <Icons.CreditCard size={16} />
                Moyens de paiement
              </button>
            </div>
         </div>
         <div className="bg-emerald-50 p-4 rounded-xl text-center min-w-[120px]">
            <div className="text-sm text-gray-500 mb-1">Trajets</div>
            <div className="text-2xl font-bold text-emerald-600">{bookings.length + announcements.length}</div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'bookings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Mes Réservations ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'announcements' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Mes Annonces ({announcements.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'bookings' && (
          <>
            {bookings.length === 0 ? (
               <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                  <Icons.Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Aucune réservation</h3>
                  <p className="text-gray-500 mb-6">Vous n'avez pas encore réservé de trajet.</p>
                  <button onClick={() => onNavigate('search')} className="text-emerald-600 font-bold hover:underline">Rechercher un trajet</button>
               </div>
            ) : (
               bookings.map(ride => (
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
                       <div className="mt-2 flex items-center gap-2">
                          <img src={ride.driver.avatarUrl} className="w-6 h-6 rounded-full" />
                          <span className="text-xs text-gray-500">Conduit par {ride.driver.name}</span>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Confirmé</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="block font-bold text-emerald-600">{ride.price} {ride.currency}</span>
                       <button className="text-xs text-gray-400 hover:text-gray-600 mt-2 flex items-center gap-1 justify-end">
                          <Icons.MessageCircle size={12} /> Contacter
                       </button>
                    </div>
                 </div>
               ))
            )}
          </>
        )}

        {activeTab === 'announcements' && (
           <>
            {announcements.length === 0 ? (
               <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                  <Icons.Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Aucune annonce</h3>
                  <p className="text-gray-500 mb-6">Vous n'avez pas encore publié de trajet.</p>
                  <button onClick={() => onNavigate('publish')} className="text-emerald-600 font-bold hover:underline">Publier un trajet</button>
               </div>
            ) : (
               announcements.map(ride => (
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
                          <span className="flex items-center gap-1"><Icons.Clock size={12} /> {ride.duration}</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="block font-bold text-emerald-600">{ride.price} {ride.currency}</span>
                       <button className="text-xs text-emerald-600 hover:text-emerald-700 mt-2 font-medium">
                          Gérer
                       </button>
                    </div>
                 </div>
               ))
            )}
           </>
        )}
      </div>
    </div>
  );
};

const PublishForm: React.FC<{ user: User, onPublish: (ride: DraftRide) => void, onCancel: () => void }> = ({ user, onPublish, onCancel }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<DraftRide>({
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    price: 3500,
    seats: 3,
    carModel: 'Peugeot 307',
    description: '',
    features: ['Climatisation']
  });

  const handleChange = (field: keyof DraftRide, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onPublish(formData);
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900">Quel est votre itinéraire ?</h2>
      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de départ</label>
          <div className="relative">
             <Icons.MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input
              type="text"
              value={formData.origin}
              onChange={(e) => handleChange('origin', e.target.value)}
              placeholder="Ex: Dakar, Liberté 6"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
             />
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lieu d'arrivée</label>
          <div className="relative">
             <Icons.MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input
              type="text"
              value={formData.destination}
              onChange={(e) => handleChange('destination', e.target.value)}
              placeholder="Ex: Saint-Louis, Gare routière"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
             />
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button
          disabled={!formData.origin || !formData.destination}
          onClick={() => setStep(2)}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
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
            placeholder="Modèle de votre voiture"
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
                onClick={() => handleChange('seats', Math.min(6, formData.seats + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >+</button>
           </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
        <div className="flex flex-wrap gap-2">
          {['Climatisation', 'Bagages acceptés', 'Non-fumeur', 'Musique', 'Animaux'].map(opt => (
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
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg"
        >
          Publier le trajet
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

  // Auto-fill "from" if user successfully located and field is empty
  useEffect(() => {
    if (userLocation.coords && userLocation.address && !from) {
      setFrom(userLocation.address);
    }
  }, [userLocation.address, userLocation.coords]);

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
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600">
            <Icons.MapPin size={20} />
          </div>
          <input
            type="text"
            placeholder="Départ (ex: Dakar)"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-gray-800 font-medium placeholder-gray-400"
            required
          />
          <button
            type="button"
            onClick={onLocate}
            title="Utiliser ma position actuelle"
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${userLocation.loading ? 'animate-spin text-emerald-600' : userLocation.coords ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-gray-100'}`}
          >
            {userLocation.loading ? (
               <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
            ) : (
              <Icons.Crosshair size={18} />
            )}
          </button>
        </div>
        
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600">
            <Icons.MapPin size={20} />
          </div>
          <input
            type="text"
            placeholder="Destination (ex: Touba)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-gray-800 font-medium placeholder-gray-400"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600">
              <Icons.Calendar size={20} />
            </div>
            <input
              type="date"
              value={date}
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
    </div>
  );
};

const RideCard: React.FC<{ ride: Ride, onClick: () => void }> = ({ ride, onClick }) => {
  const departureDate = new Date(ride.departureTime);
  const timeString = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col relative pl-4 border-l-2 border-gray-200 space-y-4">
          <div className="relative">
            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white bg-white ring-2 ring-emerald-600"></div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">{timeString}</span>
              <span className="text-gray-600 text-sm">{ride.origin}</span>
            </div>
          </div>
          <div className="relative">
             <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white bg-white ring-2 ring-emerald-600"></div>
             <div className="flex flex-col">
              <span className="font-bold text-gray-900 text-sm opacity-50">{ride.duration} de route</span>
            </div>
          </div>
           <div className="relative">
            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white bg-gray-900"></div>
            <div className="flex flex-col">
               {/* Simplified arrival calc for demo */}
              <span className="font-bold text-gray-900">--:--</span>
              <span className="text-gray-600 text-sm">{ride.destination}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-bold text-emerald-600">
            {ride.price.toLocaleString('fr-FR')} {ride.currency}
          </span>
          <span className="text-xs text-gray-400">par place</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={ride.driver.avatarUrl} 
              alt={ride.driver.name} 
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
            {ride.driver.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                <Icons.CheckCircle size={14} className="text-blue-500 fill-white" />
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{ride.driver.name}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Icons.Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-gray-700">{ride.driver.rating}</span>
              <span>({ride.driver.reviewCount} avis)</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
           {ride.features.slice(0, 2).map((feat, i) => (
             <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{feat}</span>
           ))}
        </div>
      </div>
    </div>
  );
};

const RideDetails: React.FC<{ ride: Ride, onBack: () => void, onBook: () => void, user: User | null }> = ({ ride, onBack, onBook, user }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-emerald-600 font-medium mb-6 hover:underline">
        <Icons.ChevronRight className="rotate-180" size={20} />
        Retour aux résultats
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {new Date(ride.departureTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6">
           <div className="flex flex-col relative pl-4 border-l-2 border-gray-200 space-y-8">
            <div className="relative">
              <div className="absolute -left-[23px] top-0 w-4 h-4 rounded-full border-2 border-white bg-white ring-4 ring-emerald-100">
                 <div className="w-full h-full bg-emerald-600 rounded-full"></div>
              </div>
              <div className="flex flex-col">
                 <span className="text-xl font-bold text-gray-900">{new Date(ride.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-gray-900 font-medium text-lg">{ride.origin}</span>
                <span className="text-gray-500 text-sm">Gare routière des Beaux Maraichers</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -left-[23px] top-0 w-4 h-4 rounded-full border-2 border-white bg-white ring-4 ring-gray-100">
                <div className="w-full h-full bg-gray-900 rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900">--:--</span>
                <span className="text-gray-900 font-medium text-lg">{ride.destination}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-100">
             <span className="text-gray-500">Prix total pour 1 passager</span>
             <span className="text-3xl font-bold text-emerald-600">{ride.price.toLocaleString('fr-FR')} {ride.currency}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Conducteur</h3>
        <div className="flex items-start justify-between">
           <div className="flex gap-4">
              <img src={ride.driver.avatarUrl} alt={ride.driver.name} className="w-16 h-16 rounded-full object-cover" />
              <div>
                <h4 className="text-xl font-semibold">{ride.driver.name}</h4>
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                   <Icons.Star size={16} className="text-yellow-400 fill-yellow-400" />
                   <span>{ride.driver.rating}/5</span>
                   <span className="text-gray-400">•</span>
                   <span>{ride.driver.reviewCount} avis</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                   <Icons.Shield size={16} />
                   <span>Identité vérifiée</span>
                </div>
              </div>
           </div>
           <Icons.ChevronRight className="text-gray-400" />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-gray-600 italic">"{ride.description || "Bonjour, je propose ce trajet convivial. Musique sénégalaise et bonne humeur garanties !"}"</p>
        </div>
        <div className="mt-4 flex gap-4">
           {ride.features.map(f => (
             <div key={f} className="flex items-center gap-1 text-sm text-gray-600">
               <Icons.CheckCircle size={14} className="text-emerald-500" />
               {f}
             </div>
           ))}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Véhicule: <span className="font-medium text-gray-800">{ride.carModel}</span>
        </div>
      </div>

      <button 
        onClick={onBook}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all text-lg"
      >
        Réserver maintenant
      </button>
      <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
        <Icons.Shield size={12} />
        Paiement sécurisé via Orange Money ou Wave
      </p>
    </div>
  );
};

// --- APP COMPONENT ---

function App() {
  const [currentView, setCurrentView] = useState('home'); 
  const [searchResults, setSearchResults] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // User Data State (Prototype)
  const [bookedRides, setBookedRides] = useState<Ride[]>([]);
  const [publishedRides, setPublishedRides] = useState<Ride[]>([]);

  // Geolocation State
  const [userLocation, setUserLocation] = useState<LocationState>({
    coords: null,
    address: '',
    loading: false,
    error: null
  });

  const handleLogin = () => {
    setUser(MOCK_USER);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('home');
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setUserLocation(prev => ({ ...prev, error: "La géolocalisation n'est pas supportée par votre navigateur." }));
      return;
    }

    setUserLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({
          coords: { lat: latitude, lng: longitude },
          address: 'Ma position actuelle',
          loading: false,
          error: null
        });
      },
      (error) => {
        let errorMsg = "Erreur de localisation.";
        if (error.code === error.PERMISSION_DENIED) {
           errorMsg = "Vous avez refusé l'accès à la localisation.";
        }
        setUserLocation(prev => ({ ...prev, loading: false, error: errorMsg }));
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);
    
    // Call Gemini Service
    const rides = await searchRides(params.origin, params.destination, params.date);
    
    // Mix in published rides if they match (Simulation)
    const matchingPublished = publishedRides.filter(r => 
      r.origin.toLowerCase().includes(params.origin.toLowerCase()) && 
      r.destination.toLowerCase().includes(params.destination.toLowerCase())
    );

    setSearchResults([...matchingPublished, ...rides]);
    setIsLoading(false);
    setCurrentView('search');
  };

  const handleRideClick = (ride: Ride) => {
    setSelectedRide(ride);
    setCurrentView('ride-details');
  };

  const handlePublishRide = (draft: DraftRide) => {
    if (!user) return;
    
    const newRide: Ride = {
      id: `new-${Date.now()}`,
      driver: user,
      origin: draft.origin,
      destination: draft.destination,
      departureTime: `${draft.date}T${draft.time}:00`,
      price: draft.price,
      currency: 'XOF',
      seatsAvailable: draft.seats,
      totalSeats: draft.seats,
      carModel: draft.carModel || 'Véhicule',
      features: draft.features,
      description: draft.description,
      duration: '3h 30m' // Mock duration
    };

    setPublishedRides(prev => [newRide, ...prev]);
    // Also update search results to immediately show it if searching
    setSearchResults(prev => [newRide, ...prev]);
    
    // Redirect to profile to show it's done
    setCurrentView('profile');
  };

  const initiateBooking = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmBooking = () => {
    if (selectedRide) {
      setBookedRides(prev => [selectedRide, ...prev]);
      setShowPaymentModal(false);
      setCurrentView('profile');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <>
            <div className="bg-emerald-600 text-white py-20 px-4 md:py-32 relative overflow-hidden">
               {/* Decorative patterns simulating african fabric style roughly */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
               
               <div className="max-w-6xl mx-auto relative z-10 text-center">
                 <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
                   Votre voyage commence ici.
                 </h1>
                 <p className="text-xl md:text-2xl text-emerald-100 mb-12 max-w-2xl mx-auto">
                   Rejoignez la plus grande communauté de covoiturage au Sénégal. Économique, convivial et sûr.
                 </p>
               </div>
            </div>
            
            <div className="px-4 pb-20">
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
                             ? `Position actuelle: ${userLocation.coords.lat.toFixed(4)}, ${userLocation.coords.lng.toFixed(4)}`
                             : "Activez la localisation pour voir les conducteurs autour de vous."}
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
                       <p className="text-gray-600">De Dakar à Ziguinchor, trouvez un trajet qui vous convient, même à la dernière minute.</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                       <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                         <Icons.Star size={24} />
                       </div>
                       <h3 className="text-lg font-bold mb-2">Prix bas</h3>
                       <p className="text-gray-600">Voyagez moins cher qu'en bus ou taxi '7 places' en partageant les frais.</p>
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
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {isLoading ? 'Recherche en cours...' : `${searchResults.length} trajets disponibles`}
              </h2>
              {isLoading ? (
                 <div className="space-y-4">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>
                   ))}
                 </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map(ride => (
                    <RideCard key={ride.id} ride={ride} onClick={() => handleRideClick(ride)} />
                  ))}
                  {searchResults.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <Icons.Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">Aucun trajet trouvé</h3>
                      <p className="text-gray-500 mt-2">Essayez de changer la date ou la destination.</p>
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
            user={user}
          />
        ) : null;
      
      case 'publish':
        if (!user) {
          return (
             <div className="max-w-md mx-auto px-4 py-20 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                  <Icons.User size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Connectez-vous pour publier</h2>
                <p className="text-gray-600 mb-8">
                  Pour proposer un trajet et trouver des passagers, vous devez avoir un compte Sunu Yoon.
                </p>
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg"
                >
                  Se connecter
                </button>
             </div>
          );
        }
        return <PublishForm user={user} onPublish={handlePublishRide} onCancel={() => setCurrentView('home')} />;
      
      case 'profile':
        if (!user) {
           setCurrentView('home');
           return null;
        }
        return (
          <ProfileView 
             user={user} 
             bookings={bookedRides} 
             announcements={publishedRides} 
             onNavigate={setCurrentView}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Layout 
      onNavigate={setCurrentView} 
      currentView={currentView}
      user={user}
      onLoginClick={() => setShowLoginModal(true)}
      onLogoutClick={handleLogout}
    >
      {renderContent()}
      <CookieBanner />
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onLogin={handleLogin}
      />
      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={confirmBooking}
        price={selectedRide?.price || 0}
      />
    </Layout>
  );
}

export default App;