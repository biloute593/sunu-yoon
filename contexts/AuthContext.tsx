import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { TokenManager } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, tokens?: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      const token = TokenManager.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Restaurer l'utilisateur depuis localStorage pour une UX immédiate
        // L'idéal serait de valider le token avec un appel /auth/me
        const storedUser = localStorage.getItem('sunu_yoon_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Erreur chargement user:', error);
        TokenManager.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = (userData: User, tokens?: { accessToken: string; refreshToken: string }) => {
    setUser(userData);
    localStorage.setItem('sunu_yoon_user', JSON.stringify(userData));

    if (tokens) {
      TokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sunu_yoon_user');
    TokenManager.clearTokens();
    // Recharger la page pour nettoyer tous les états
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
