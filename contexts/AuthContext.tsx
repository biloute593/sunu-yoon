import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, AuthUser, LoginCredentials, RegisterData } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; requiresVerification?: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; requiresVerification?: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyCode: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendCode: (phone: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getCurrentUser();
        if (storedUser && authService.isAuthenticated()) {
          setUser(storedUser);
          // Rafraîchir les données utilisateur depuis le serveur
          try {
            const freshUser = await authService.getProfile();
            setUser(freshUser);
          } catch (error) {
            // Token expiré ou invalide, essayer de rafraîchir
            const refreshed = await authService.refreshToken();
            if (refreshed) {
              const freshUser = await authService.getProfile();
              setUser(freshUser);
            } else {
              // Échec du rafraîchissement, déconnecter
              authService.clearAuth();
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
        authService.clearAuth();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);
      
      if (response.requiresVerification) {
        return { success: true, requiresVerification: true };
      }
      
      if (response.user) {
        setUser(response.user);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erreur de connexion. Vérifiez vos identifiants.' 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await authService.register(data);
      
      // L'inscription nécessite toujours une vérification
      return { success: true, requiresVerification: true };
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erreur lors de l\'inscription.' 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyCode = useCallback(async (phone: string, code: string) => {
    try {
      setIsLoading(true);
      const response = await authService.verifyCode(phone, code);
      
      if (response.user) {
        setUser(response.user);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Erreur de vérification:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Code invalide ou expiré.' 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendCode = useCallback(async (phone: string) => {
    try {
      await authService.resendCode(phone);
      return { success: true };
    } catch (error: any) {
      console.error('Erreur renvoi code:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Impossible de renvoyer le code.' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authService.getProfile();
      setUser(freshUser);
    } catch (error) {
      console.error('Erreur refresh user:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    verifyCode,
    resendCode,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
