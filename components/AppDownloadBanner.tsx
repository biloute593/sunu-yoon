import React, { useState } from 'react';
import { Icons } from './Icons';

const AppDownloadBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS] = useState(/iPhone|iPad|iPod/.test(navigator.userAgent));
  const [isAndroid] = useState(/Android/.test(navigator.userAgent));
  
  // Ne pas afficher sur desktop ou si déjà fermé
  if (isDismissed || (!isIOS && !isAndroid)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 p-4 md:hidden animate-slide-up">
      <div className="flex items-center gap-4">
        {/* App Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
          <Icons.Car size={28} />
        </div>
        
        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 flex items-center gap-2">
            Sunu Yoon
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Nouveau</span>
          </div>
          <p className="text-sm text-gray-500 truncate">
            Téléchargez l'app pour une meilleure expérience
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <Icons.Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <span className="text-xs text-gray-400">4.8 • Gratuit</span>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Fermer"
          >
            <Icons.X size={20} />
          </button>
          <a
            href={isIOS ? "https://apps.apple.com/app/sunu-yoon" : "https://play.google.com/store/apps/details?id=sn.sunuyoon"}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Télécharger
          </a>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadBanner;
