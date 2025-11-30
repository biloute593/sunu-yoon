import React, { useState } from 'react';
import { Icons } from './Icons';

interface DriverBannerProps {
  onPublish: () => void;
}

const DriverBanner: React.FC<DriverBannerProps> = ({ onPublish }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-white rounded-full blur-2xl"></div>
        <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 py-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl">
              <Icons.Car size={24} />
            </div>
            <div className="text-center md:text-left">
              <p className="font-bold text-lg">
                🚗 Vous avez une voiture ? Rentabilisez vos trajets !
              </p>
              <p className="text-emerald-100 text-sm">
                Gagnez jusqu'à 50 000 XOF par trajet • Inscription gratuite
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onPublish}
              className="px-6 py-2.5 bg-white text-emerald-600 font-bold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <Icons.PlusCircle size={18} />
              Publier un trajet
            </button>
            <button 
              onClick={() => setIsDismissed(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <Icons.X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverBanner;
