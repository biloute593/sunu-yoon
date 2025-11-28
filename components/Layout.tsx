import React, { useState } from 'react';
import { Icons } from './Icons';
import { User } from '../types';

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
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white mr-2">
                <Icons.Car size={24} />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                Sunu Yoon
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => onNavigate('search')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${currentView === 'search' ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'}`}
              >
                <Icons.Search size={18} />
                Rechercher
              </button>
              <button 
                onClick={() => onNavigate('publish')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${currentView === 'publish' ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'}`}
              >
                <Icons.PlusCircle size={18} />
                Publier un trajet
              </button>
              
              {user ? (
                <div className="relative group">
                  <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-full transition-colors">
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    <Icons.ChevronRight size={14} className="rotate-90 text-gray-400" />
                  </div>
                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 hidden group-hover:block animate-fade-in z-50">
                    <div className="px-4 py-2 border-b border-gray-50">
                      <p className="text-xs text-gray-500">Connecté en tant que</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                    </div>
                    <button onClick={() => onNavigate('profile')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-emerald-600">
                      Mes trajets
                    </button>
                    <button onClick={onLogoutClick} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      Déconnexion
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={onLoginClick}
                  className="flex items-center space-x-2 text-gray-600 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-full transition-colors"
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
          <div className="md:hidden bg-white border-t border-gray-100 absolute w-full z-50 animate-fade-in-down shadow-lg">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {user && (
                 <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 mb-2">
                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-bold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">Membre vérifié</div>
                    </div>
                 </div>
              )}
              
              <button 
                onClick={() => { onNavigate('search'); setIsMenuOpen(false); }}
                className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50"
              >
                Rechercher un trajet
              </button>
              <button 
                onClick={() => { onNavigate('publish'); setIsMenuOpen(false); }}
                className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-emerald-600 hover:bg-gray-50"
              >
                Publier un trajet
              </button>
              
              {user ? (
                 <button 
                   onClick={() => { onLogoutClick(); setIsMenuOpen(false); }}
                   className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                 >
                   Déconnexion
                 </button>
              ) : (
                <button 
                  onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
                  className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-emerald-600 hover:bg-emerald-50 font-bold"
                >
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
      <footer className="bg-gray-50 border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-4">À propos</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-emerald-600">Fonctionnement</a></li>
                <li><a href="#" className="text-gray-600 hover:text-emerald-600">À propos de Sunu Yoon</a></li>
                <li><a href="#" className="text-gray-600 hover:text-emerald-600">Presse</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-4">Support</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-emerald-600">Centre d'aide</a></li>
                <li><a href="#" className="text-gray-600 hover:text-emerald-600">Règles de bonne conduite</a></li>
                <li><a href="#" className="text-gray-600 hover:text-emerald-600">Assurance</a></li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                  <Icons.Car size={16} />
                </div>
                <span className="text-xl font-bold text-gray-900">Sunu Yoon</span>
              </div>
              <p className="text-gray-500 text-sm">
                Voyagez partout au Sénégal, en bonne compagnie et à moindre coût.
              </p>
              <div className="mt-4 flex space-x-4">
                <span className="text-gray-400 hover:text-gray-500 cursor-pointer">Facebook</span>
                <span className="text-gray-400 hover:text-gray-500 cursor-pointer">Twitter</span>
                <span className="text-gray-400 hover:text-gray-500 cursor-pointer">Instagram</span>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
            &copy; 2024 Sunu Yoon Sénégal. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;