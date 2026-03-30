import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
        // Évite les états incohérents (user local sans token)
        localStorage.removeItem('sunu_yoon_user');
        setIsLoading(false);
        return;
      }

      try {
        // Restaurer l'utilisateur depuis localStorage pour une UX immédiate
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

  const login = useCallback((userData: User, tokens?: { accessToken: string; refreshToken: string }) => {
    setUser(userData);
    localStorage.setItem('sunu_yoon_user', JSON.stringify(userData));

    if (tokens) {
      TokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('sunu_yoon_user');
    TokenManager.clearTokens();
    // Recharger la page pour nettoyer tous les états
    window.location.href = '/';
  }, []);

  // isAuthenticated is derived from reactive state, NOT from TokenManager.isAuthenticated()
  // This prevents the "s is not a function" crash in production minified builds
  const isAuthenticated = user !== null && !!TokenManager.getAccessToken();

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
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
