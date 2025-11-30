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
  onLoginClick, 
  onLogoutClick 
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
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => onNavigate('home')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white mr-2 shadow-md">
                <Icons.Car size={22} />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                Sunu Yoon
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-4">
              {/* BOUTON AJOUTER UN TRAJET - EN PREMIER ET BIEN VISIBLE */}
              <button 
                onClick={() => onNavigate('publish')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-105"
              >
                <Icons.PlusCircle size={18} />
                Ajouter un trajet
              </button>
              <button 
                onClick={() => onNavigate('search')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all ${currentView === 'search' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'}`}
              >
                <Icons.Search size={18} />
                Rechercher
              </button>
              
              {user ? (
                <div className="relative">
                  <div 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-full transition-colors"
                  >
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border-2 border-emerald-100" />
                    <span className="text-sm font-medium text-gray-700">{user.name.split(' ')[0]}</span>
                    <Icons.ChevronRight size={14} className={`text-gray-400 transition-transform ${showDropdown ? 'rotate-90' : 'rotate-90'}`} />
                  </div>
                  {/* Dropdown */}
                  {showDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs text-gray-500">Connecté en tant que</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Icons.Star size={12} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-gray-600">{user.rating} • {user.reviewCount} avis</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => { onNavigate('profile'); setShowDropdown(false); }} 
                          className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-emerald-600"
                        >
                          <Icons.User size={16} />
                          Mon profil
                        </button>
                        <button 
                          onClick={() => { onNavigate('profile'); setShowDropdown(false); }} 
                          className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-emerald-600"
                        >
                          <Icons.Car size={16} />
                          Mes trajets
                        </button>
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button 
                            onClick={handleLogout} 
                            className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Icons.LogOut size={16} />
                            Déconnexion
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div 
                  onClick={onLoginClick}
                  className="flex items-center space-x-2 text-gray-600 cursor-pointer hover:bg-gray-100 px-4 py-2 rounded-full transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <Icons.User size={18} />
                  </div>
                  <span className="text-sm font-medium">Connexion</span>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-emerald-600 p-2"
              >
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
              
              {/* BOUTON AJOUTER UN TRAJET - EN PREMIER SUR MOBILE */}
              <button 
                onClick={() => { onNavigate('publish'); setIsMenuOpen(false); }}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-md mb-3"
              >
                <Icons.PlusCircle size={20} />
                Ajouter un trajet
              </button>
              <button 
                onClick={() => { onNavigate('search'); setIsMenuOpen(false); }}
                className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
              >
                <Icons.Search size={20} />
                Rechercher un trajet
              </button>
              
              {user ? (
                <>
                  <button 
                    onClick={() => { onNavigate('profile'); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                  >
                    <Icons.User size={20} />
                    Mon profil
                  </button>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button 
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
                    >
                      <Icons.LogOut size={20} />
                      Déconnexion
                    </button>
                  </div>
                </>
              ) : (
                <button 
                  onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-semibold text-emerald-600 hover:bg-emerald-50 mt-2 border border-emerald-200"
                >
                  <Icons.User size={20} />
                  Connexion / Inscription
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto">
        {/* Newsletter Section */}
        <div className="border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold mb-2">Restez connecté 📱</h3>
                <p className="text-gray-400 text-sm">Recevez nos meilleures offres et actualités</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <input 
                  type="email" 
                  placeholder="Votre email..." 
                  className="flex-1 md:w-64 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-colors whitespace-nowrap">
                  S'abonner
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Footer */}
        <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white shadow-lg">
                  <Icons.Car size={20} />
                </div>
                <span className="text-2xl font-bold">Sunu Yoon</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                La première plateforme de covoiturage au Sénégal. Voyagez en toute sécurité à travers tout le pays. 🇸🇳
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
            
            {/* Découvrir */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Découvrir</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Comment ça marche</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Rechercher un trajet</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Proposer un trajet</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Trajets populaires</a></li>
              </ul>
            </div>
            
            {/* À propos */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">À propos</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Qui sommes-nous ?</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Notre mission</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Presse</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Blog</a></li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Support</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Sécurité</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Assurance trajet</a></li>
                <li><a href="#" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors">Nous contacter</a></li>
              </ul>
            </div>
          </div>
          
          {/* Payment Methods */}
          <div className="border-t border-gray-800 pt-8 mb-8">
            <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm">
              <span className="font-medium text-gray-400">Moyens de paiement :</span>
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
                <span className="text-orange-500 font-bold">Orange</span>
                <span>Money</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
                <span className="text-blue-400 font-bold">Wave</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
                <span className="text-yellow-400 font-bold">Free</span>
                <span>Money</span>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">
              © 2024 Sunu Yoon Sénégal. Tous droits réservés.
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Conditions d'utilisation</a>
              <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Politique de confidentialité</a>
              <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;