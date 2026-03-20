import React from 'react';
import { Icons } from './Icons';
import { FrontendRide } from '../types';

const RideDetails: React.FC<{
  ride: FrontendRide;
  onBack: () => void;
  onBook: () => void;
  onChat: () => void;
}> = ({ ride, onBack, onBook, onChat }) => {
  const departureDate = new Date(ride.departureTime);
  const formattedDate = departureDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedTime = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const durationMatch = ride.duration?.match(/(\d+)/);
  const durationMinutes = durationMatch ? parseInt(durationMatch[1]) * 60 : 120;
  const arrivalDate = new Date(departureDate.getTime() + durationMinutes * 60000);
  const arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const featureEmojis: Record<string, string> = {
    'Climatisation': '❄️',
    'Bagages acceptés': '🧳',
    'Non-fumeur': '🚭',
    'Musique': '🎵',
    'Animaux acceptés': '🐕',
    'WiFi': '📶',
    'Prise USB': '🔌',
    'Silence préféré': '🤫'
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-emerald-600 font-medium mb-6 hover:gap-3 transition-all group">
        <Icons.ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={20} />
        Retour aux résultats
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Icons.Calendar size={16} />
            {formattedDate}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {ride.origin} → {ride.destination}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-600">{ride.price.toLocaleString('fr-FR')}</div>
          <div className="text-sm text-gray-500">{ride.currency} / place</div>
          <div className="mt-2 text-xs text-gray-500">
            {Math.max(0, (ride.totalSeats || 0) - (ride.seatsAvailable || 0))}/{ride.totalSeats} ajoutée(s) • {ride.seatsAvailable} place(s) disponible(s)
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Icons.Clock size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">Durée estimée: <strong className="text-gray-900">{ride.duration}</strong></span>
          </div>

          <div className="flex flex-col relative pl-6 border-l-2 border-emerald-200 space-y-10">
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formattedTime}</div>
                  <div className="text-gray-700 font-medium">{ride.origin}</div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Départ</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-5 h-5 rounded-full bg-gray-800 ring-4 ring-gray-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{arrivalTime}</div>
                  <div className="text-gray-700 font-medium">{ride.destination}</div>
                </div>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">Arrivée</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-wrap gap-4 justify-around text-center">
          <div>
            <Icons.Users className="mx-auto text-gray-400 mb-1" size={20} />
            <div className="text-sm text-gray-500">Places</div>
            <div className="font-bold text-gray-900">{ride.seatsAvailable}</div>
          </div>
          <div>
            <Icons.Car className="mx-auto text-gray-400 mb-1" size={20} />
            <div className="text-sm text-gray-500">Véhicule</div>
            <div className="font-bold text-gray-900 text-sm">{ride.carModel || 'Non précisé'}</div>
          </div>
          <div>
            <Icons.Star className="mx-auto text-yellow-400 fill-yellow-400 mb-1" size={20} />
            <div className="text-sm text-gray-500">Note</div>
            <div className="font-bold text-gray-900">{ride.driver.rating}/5</div>
          </div>
        </div>
      </div>

      {/* Driver */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Icons.User size={20} className="text-gray-400" />
          Votre conducteur
        </h3>
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="relative">
              <img src={ride.driver.avatarUrl} alt={ride.driver.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100" />
              {ride.driver.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white">
                  <Icons.CheckCircle size={12} />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900">{ride.driver.name}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Icons.Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="font-medium">{ride.driver.rating}/5</span>
                <span className="text-gray-300">•</span>
                <span>{ride.driver.reviewCount} avis</span>
              </div>
              {ride.driver.isVerified && (
                <div className="flex items-center gap-1 text-sm text-emerald-600 mt-2 font-medium">
                  <Icons.Shield size={14} />
                  Profil vérifié
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onChat}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-emerald-100 rounded-xl transition-colors group"
          >
            <Icons.MessageCircle className="text-gray-600 group-hover:text-emerald-600" size={20} />
            <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700 hidden sm:inline">Contacter</span>
          </button>
        </div>

        {ride.description && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-gray-600 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed italic">
              "{ride.description}"
            </p>
          </div>
        )}
      </div>

      {/* Features */}
      {ride.features.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Icons.CheckCircle size={20} className="text-emerald-500" />
            Ce trajet inclut
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ride.features.map(f => (
              <div key={f} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium">
                <span>{featureEmojis[f] || '✓'}</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking CTA */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-sm p-4 -mx-4 rounded-2xl shadow-lg border border-gray-100">
        <button
          onClick={onBook}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all text-lg flex items-center justify-center gap-2"
        >
          <Icons.CheckCircle size={20} />
          Je m'ajoute ({ride.price.toLocaleString('fr-FR')} {ride.currency} / place)
        </button>
      </div>
    </div>
  );
};

export default RideDetails;
