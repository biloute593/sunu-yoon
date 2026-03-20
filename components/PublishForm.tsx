import React, { useState } from 'react';
import { Icons } from './Icons';
import { PublishCityInput } from './CityAutocomplete';
import { rideService, Ride as ApiRide } from '../services/rideService';
import { DraftRide } from '../types';

const PublishForm: React.FC<{
  onPublish: (ride: ApiRide) => void;
  onCancel: () => void;
  isAuthenticated?: boolean;
}> = ({ onPublish, onCancel, isAuthenticated = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);
  const [formData, setFormData] = useState<DraftRide & { driverName?: string; driverPhone?: string }>({
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    price: 3500,
    seats: 3,
    carModel: '',
    description: '',
    features: ['Climatisation'],
    driverName: '',
    driverPhone: ''
  });

  const handleChange = (field: keyof (DraftRide & { driverName?: string; driverPhone?: string }), value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const departureTime = `${formData.date}T${formData.time}:00`;

      const driverInfo = (!isAuthenticated && formData.driverName && formData.driverPhone)
        ? {
          id: 'guest',
          firstName: formData.driverName.split(' ')[0],
          lastName: formData.driverName.split(' ').slice(1).join(' ') || '',
          name: formData.driverName,
          phone: formData.driverPhone,
          isVerified: false,
          rating: 5,
          reviewCount: 0,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.driverName)}&background=10b981&color=fff`
        }
        : undefined;

      const rideData = {
        origin: formData.origin,
        destination: formData.destination,
        departureTime,
        price: formData.price,
        seatsAvailable: formData.seats,
        carModel: formData.carModel,
        description: formData.description,
        features: formData.features,
        driver: driverInfo
      };

      const createdRide = await rideService.createRide(rideData);
      setPublishedSuccess(true);
      onPublish(createdRide);
    } catch (error) {
      console.error('Erreur création trajet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la publication du trajet';
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen for guest users
  if (publishedSuccess && !isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
          <Icons.CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 Trajet publié avec succès !</h2>
        <p className="text-gray-600 mb-6">
          Votre trajet <strong>{formData.origin}</strong> → <strong>{formData.destination}</strong> est maintenant visible par les passagers.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <Icons.AlertCircle className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <p className="text-yellow-800 font-medium">Conseil</p>
              <p className="text-yellow-700 text-sm">
                Créez un compte pour gérer vos trajets, recevoir des notifications et être contacté par les passagers.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const minDate = new Date().toISOString().split('T')[0];
  const featureOptions = ['Climatisation', 'Bagages acceptés', 'Non-fumeur', 'Musique', 'Animaux acceptés'];
  const isFormValid = Boolean(
    formData.origin &&
    formData.destination &&
    formData.date &&
    formData.time &&
    (isAuthenticated || (formData.driverName && formData.driverPhone))
  );

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white py-20 px-4 md:py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse"></div>

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
            Publier un trajet
          </h1>
          <p className="text-xl md:text-2xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Remplissez les infos et publiez.
          </p>
          <button
            onClick={onCancel}
            className="absolute top-6 right-6 text-sm font-medium text-white/80 hover:text-white flex items-center gap-2"
          >
            <Icons.ChevronRight className="rotate-180" size={16} />
            Retour
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10 pb-20">
        {!isAuthenticated && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 md:items-center shadow-lg mb-6">
            <div className="flex items-center gap-3 text-emerald-800 font-semibold">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Icons.CheckCircle size={20} />
              </div>
              Publiez gratuitement sans compte
            </div>
            <p className="text-sm text-emerald-800 flex-1">Nous utiliserons votre nom et numéro pour informer les passagers intéressés. Créez un compte plus tard pour gérer vos annonces.</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            {/* Itinéraire */}
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Itinéraire</p>
                  <h2 className="text-2xl font-bold text-gray-900 mt-2">Points de départ et d'arrivée</h2>
                </div>
                <span className="text-xs font-semibold text-gray-400">1/3</span>
              </div>
              <div className="grid gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Lieu de départ*</label>
                  <PublishCityInput value={formData.origin} onChange={(val) => handleChange('origin', val)} placeholder="Ex: Dakar, Liberté 6" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Lieu d'arrivée*</label>
                  <PublishCityInput value={formData.destination} onChange={(val) => handleChange('destination', val)} placeholder="Ex: Saint-Louis, Gare routière" />
                </div>
              </div>
            </section>

            {/* Horaires & véhicule */}
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Horaires & véhicule</p>
                  <h2 className="text-2xl font-bold text-gray-900 mt-2">Quand partez-vous ?</h2>
                </div>
                <span className="text-xs font-semibold text-gray-400">2/3</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Date*</label>
                  <input type="date" value={formData.date} min={minDate} onChange={(e) => handleChange('date', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Heure*</label>
                  <input type="time" value={formData.time} onChange={(e) => handleChange('time', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Véhicule</label>
                <input type="text" value={formData.carModel} onChange={(e) => handleChange('carModel', e.target.value)} placeholder="Ex: Peugeot 308, Toyota Corolla..." className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </section>

            {/* Guest identity */}
            {!isAuthenticated && (
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Icons.User size={18} />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Coordonnées</p>
                    <h2 className="text-xl font-bold text-gray-900">Présentez-vous aux passagers</h2>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Nom complet*</label>
                    <input type="text" value={formData.driverName || ''} onChange={(e) => handleChange('driverName', e.target.value)} placeholder="Ex: Moussa Diop" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Téléphone / WhatsApp*</label>
                    <input type="tel" value={formData.driverPhone || ''} onChange={(e) => handleChange('driverPhone', e.target.value)} placeholder="Ex: 771234567" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" required />
                  </div>
                </div>
                <p className="text-sm text-gray-500">Ces infos servent à vous contacter.</p>
              </section>
            )}

            {/* Features & description */}
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Confort & infos</p>
                  <h2 className="text-2xl font-bold text-gray-900 mt-2">Personnalisez votre offre</h2>
                </div>
                <span className="text-xs font-semibold text-gray-400">3/3</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-3">Options disponibles</label>
                <div className="flex flex-wrap gap-2">
                  {featureOptions.map(opt => {
                    const isSelected = formData.features.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const newFeatures = isSelected
                            ? formData.features.filter(f => f !== opt)
                            : [...formData.features, opt];
                          handleChange('features', newFeatures);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${isSelected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-inner'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Message aux passagers</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Dites-en plus sur vos habitudes de conduite, vos préférences ou un point de rendez-vous précis."
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none h-28 resize-none"
                />
              </div>
            </section>
          </div>

          {/* Sidebar — pricing & submit */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Tarification</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">Ajustez vos conditions</h3>
              </div>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Prix par passager</p>
                    <p className="text-3xl font-extrabold text-emerald-600">{formData.price.toLocaleString('fr-FR')} XOF</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => handleChange('price', Math.max(500, formData.price - 500))} className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all transform active:scale-95">-</button>
                    <button type="button" onClick={() => handleChange('price', formData.price + 500)} className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all transform active:scale-95">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Saisir votre tarif</label>
                  <div className="flex items-center rounded-2xl border-2 border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden transition-all">
                    <span className="px-4 py-3 text-gray-500 bg-gray-50 border-r border-gray-100 font-semibold">XOF</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.price}
                      onChange={(e) => { const value = e.target.value.replace(/[^0-9]/g, ''); handleChange('price', value === '' ? 0 : parseInt(value, 10)); }}
                      onBlur={(e) => { const value = Number(e.target.value); if (!value || value < 1) handleChange('price', 500); }}
                      placeholder="Ex: 2500"
                      className="w-full px-4 py-3 text-2xl font-bold text-emerald-600 bg-white focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Les voyageurs apprécient les tarifs clairs. Tapez librement le tarif de votre choix.</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Places disponibles</p>
                    <p className="text-3xl font-extrabold text-gray-900">{formData.seats}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => handleChange('seats', Math.max(1, formData.seats - 1))} className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all transform active:scale-95">-</button>
                    <button type="button" onClick={() => handleChange('seats', Math.min(7, formData.seats + 1))} className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 transition-all transform active:scale-95">+</button>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isFormValid}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg hover:shadow-2xl hover:from-emerald-700 hover:to-emerald-600 transform hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Publication...
                    </>
                  ) : (
                    <>
                      <Icons.CheckCircle size={18} />
                      Publier le trajet
                    </>
                  )}
                </button>
                <button onClick={onCancel} className="w-full py-3 rounded-2xl font-semibold text-gray-500 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all transform active:scale-95">
                  Annuler
                </button>
                <p className="text-xs text-gray-400 text-center">
                  En publiant, vous acceptez les conditions SUNU YOON et vous engagez à honorer votre trajet.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishForm;
