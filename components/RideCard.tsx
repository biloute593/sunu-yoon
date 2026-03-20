import React from 'react';
import { Icons } from './Icons';
import { FrontendRide } from '../types';

const RideCard: React.FC<{
  ride: FrontendRide;
  onClick: () => void;
  onBook?: () => void;
  onContact?: () => void;
}> = ({ ride, onClick, onBook, onContact }) => {
  const departureDate = new Date(ride.departureTime);
  const timeString = departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const seatsTaken = Math.max(0, (ride.totalSeats || 0) - (ride.seatsAvailable || 0));

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 hover:shadow-xl hover:border-emerald-300 transition-all transform hover:-translate-y-2 cursor-pointer group flex flex-col min-h-[320px]"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col relative pl-6 border-l-2 border-emerald-200 space-y-6">
          <div className="relative">
            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900">{timeString}</span>
              <span className="text-gray-600">{ride.origin}</span>
            </div>
          </div>
          <div className="relative pl-0 text-xs text-gray-400 flex items-center gap-1">
            <Icons.Clock size={12} />
            {ride.duration}
          </div>
          <div className="relative">
            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-gray-800 ring-4 ring-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-gray-600">{ride.destination}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-bold text-emerald-600">
            {ride.price.toLocaleString('fr-FR')}
          </span>
          <span className="text-xs text-gray-400">{ride.currency}</span>
        </div>
      </div>

      {ride.features.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {ride.features.slice(0, 3).map(f => (
            <span key={f} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
              {f === 'Climatisation' ? '❄️' : f === 'Musique' ? '🎵' : f === 'Bagages acceptés' ? '🧳' : f === 'Non-fumeur' ? '🚭' : '✓'} {f}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-auto">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={ride.driver.avatarUrl}
              alt={ride.driver.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
            {ride.driver.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Icons.CheckCircle size={14} className="text-blue-500 fill-blue-100" />
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{ride.driver.name}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Icons.Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-gray-700">{ride.driver.rating}</span>
              <span className="text-gray-400">({ride.driver.reviewCount})</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium">
              {seatsTaken}/{ride.totalSeats} ajoutée{seatsTaken > 1 ? 's' : ''} • {ride.seatsAvailable} dispo
            </span>
          </div>

          <div className="flex gap-2 mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onContact) onContact();
              }}
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Contacter
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onBook) onBook();
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Je m'ajoute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideCard;
