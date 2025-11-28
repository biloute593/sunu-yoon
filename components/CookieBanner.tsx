import React, { useState, useEffect } from 'react';

const CookieBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('sunu-yoon-cookie-consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('sunu-yoon-cookie-consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up">
      <div className="text-sm">
        <p className="font-semibold mb-1">Nous respectons votre vie privée</p>
        <p className="text-gray-300">
          Sunu Yoon utilise des cookies pour améliorer votre expérience de navigation, mesurer l'audience et vous proposer des trajets adaptés à vos besoins.
        </p>
      </div>
      <div className="flex gap-2 whitespace-nowrap">
        <button 
          onClick={() => setShow(false)}
          className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
        >
          Continuer sans accepter
        </button>
        <button 
          onClick={acceptCookies}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full transition-colors"
        >
          Accepter tout
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
