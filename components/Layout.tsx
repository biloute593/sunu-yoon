import React, { useState } from 'react';
import { Icons } from './Icons';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (view: string) => void;
  currentView: string;
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onNavigate, 
  currentView, 
  user, 
  onLoginClick
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    onNavigate('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white mr-2 shadow-md">
                <Icons.Car size={22} />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                Sunu Yoon
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-3">
              <button onClick={() => onNavigate('publish')} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-105">
                <Icons.PlusCircle size={18} />
                Ajouter un trajet
              </button>
              <button onClick={() => onNavigate('search')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${currentView === 'search' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'}`}>
                <Icons.Search size={18} />
                Rechercher
              </button>
              <button onClick={() => onNavigate('ride-request')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all bg-rose-50 text-rose-700 hover:bg-rose-100">
                🚖 Course immediate
              </button>
              <button onClick={() => onNavigate('driver-mode')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
                🚗 Mode Chauffeur
              </button>
              
              {user ? (
                <div className="relative">
                  <div onClick={() => setShowDropdown(!showDropdown)} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-full transition-colors">
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border-2 border-emerald-100" />
                    <span className="text-sm font-medium text-gray-700">{user.name.split(' ')[0]}</span>
                    <Icons.ChevronRight size={14} className={`text-gray-400 transition-transform ${showDropdown ? '-rotate-90' : 'rotate-90'}`} />
                  </div>
                  {showDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs text-gray-500">Connecte en tant que</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Icons.Star size={12} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-gray-600">{user.rating} • {user.reviewCount} avis</span>
                          </div>
                        </div>
                        <button onClick={() => { onNavigate('profile'); setShowDropdown(false); }} className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-emerald-600">
                          <Icons.User size={16} />
                          Mon profil
                        </button>
                        <button onClick={() => { onNavigate('profile'); setShowDropdown(false); }} className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-emerald-600">
                          <Icons.Car size={16} />
                          Mes trajets
                        </button>
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button onClick={handleLogout} className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                            <Icons.LogOut size={16} />
                            Deconnexion
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div onClick={onLoginClick} className="flex items-center space-x-2 text-gray-600 cursor-pointer hover:bg-gray-100 px-4 py-2 rounded-full transition-colors">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <Icons.User size={18} />
                  </div>
                  <span className="text-sm font-medium">Connexion</span>
                </div>
              )}
            </nav>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-emerald-600 p-2">
                {isMenuOpen ? <Icons.X size={24} /> : <Icons.Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 absolute w-full z-50 animate-fade-in-down shadow-xl">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {user && (
                <div className="flex items-center gap-3 px-3 py-4 border-b border-gray-100 mb-2">
                  <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full border-2 border-emerald-100" />
                  <div>
                    <div className="font-bold text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Icons.Star size={10} className="text-yellow-400 fill-yellow-400" />
                      {user.rating} • {user.reviewCount} avis
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => { onNavigate('publish'); setIsMenuOpen(false); }} className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-md mb-3">
                <Icons.PlusCircle size={20} />
                Ajouter un trajet
              </button>
              <button onClick={() => { onNavigate('search'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50">
                <Icons.Search size={20} />
                Rechercher un trajet
              </button>
              <button onClick={() => { onNavigate('ride-request'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-medium text-rose-700 hover:bg-rose-50">
                <Icons.Navigation size={20} />
                Course immediate
              </button>
              <button onClick={() => { onNavigate('driver-mode'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-medium text-yellow-700 hover:bg-yellow-50">
                <Icons.Car size={20} />
                Mode Chauffeur
              </button>
              {user ? (
                <>
                  <button onClick={() => { onNavigate('profile'); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50">
                    <Icons.User size={20} />
                    Mon profil
                  </button>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50">
                      <Icons.LogOut size={20} />
                      Deconnexion
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => { onLoginClick(); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-semibold text-emerald-600 hover:bg-emerald-50 mt-2 border border-emerald-200">
                  <Icons.User size={20} />
                  Connexion / Inscription
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow pb-16 md:pb-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                  <Icons.Car size={18} className="text-white" />
                </div>
                <span className="text-xl font-bold text-white">Sunu Yoon</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">La plateforme de covoiturage de confiance au Senegal. Voyagez ensemble, economisez mieux.</p>
              <div className="flex gap-2">
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  Trajets en temps reel
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">Navigation</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><button onClick={() => onNavigate('home')} className="hover:text-emerald-400 transition-colors text-left">Accueil</button></li>
                <li><button onClick={() => onNavigate('search')} className="hover:text-emerald-400 transition-colors text-left">Rechercher un trajet</button></li>
                <li><button onClick={() => onNavigate('publish')} className="hover:text-emerald-400 transition-colors text-left">Proposer un trajet</button></li>
                <li><button onClick={() => onNavigate('ride-request')} className="hover:text-emerald-400 transition-colors text-left">Course immediate</button></li>
                <li><button onClick={() => onNavigate('driver-mode')} className="hover:text-emerald-400 transition-colors text-left">Mode Chauffeur</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">Aide et Support</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><span className="hover:text-emerald-400 transition-colors cursor-pointer">Comment ca marche ?</span></li>
                <li><span className="hover:text-emerald-400 transition-colors cursor-pointer">Questions frequentes</span></li>
                <li><span className="hover:text-emerald-400 transition-colors cursor-pointer">Signaler un probleme</span></li>
                <li><span className="hover:text-emerald-400 transition-colors cursor-pointer">Conditions d'utilisation</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">Contact</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Icons.Phone size={13} className="text-gray-500 flex-shrink-0" />
                  <span>+221 77 000 00 00</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icons.MessageCircle size={13} className="text-gray-500 flex-shrink-0" />
                  <span>contact@sunuyoon.sn</span>
                </li>
              </ul>
              <div className="flex gap-2 mt-4">
                <a href="#" aria-label="Facebook" className="w-8 h-8 bg-gray-800 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors text-sm font-bold text-gray-400 hover:text-white">f</a>
                <a href="#" aria-label="WhatsApp" className="w-8 h-8 bg-gray-800 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors text-gray-400 hover:text-white">
                  <Icons.MessageCircle size={14} />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-gray-500 text-sm">© 2025 Sunu Yoon Senegal. Tous droits reserves.</p>
            <div className="flex gap-4 text-xs text-gray-600">
              <span className="hover:text-gray-400 transition-colors cursor-pointer">Confidentialite</span>
              <span className="hover:text-gray-400 transition-colors cursor-pointer">CGU</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40" role="navigation" aria-label="Navigation mobile">
        <div className="flex items-end justify-around px-2 pt-1 pb-2">
          <button onClick={() => onNavigate('home')} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${currentView === 'home' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`} aria-label="Accueil">
            <Icons.Car size={22} />
            <span className="text-[10px] font-semibold">Accueil</span>
          </button>
          <button onClick={() => onNavigate('search')} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${currentView === 'search' || currentView === 'ride-details' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`} aria-label="Rechercher">
            <Icons.Search size={22} />
            <span className="text-[10px] font-semibold">Rechercher</span>
          </button>
          <button onClick={() => onNavigate('publish')} className="flex flex-col items-center -mt-5" aria-label="Proposer un trajet">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 active:scale-95 transition-transform">
              <Icons.PlusCircle size={26} className="text-white" />
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 mt-0.5">Proposer</span>
          </button>
          <button
            onClick={() => { if (user) { onNavigate('profile'); } else { onLoginClick(); } }}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors relative ${currentView === 'profile' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            aria-label="Profil"
          >
            {user ? (
              <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full border border-emerald-200 object-cover" />
            ) : (
              <Icons.User size={22} />
            )}
            <span className="text-[10px] font-semibold">{user ? 'Profil' : 'Connexion'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
