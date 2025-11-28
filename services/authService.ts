import { ApiClient, TokenManager } from './apiClient';

// Types exportés
export interface AuthUser {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isPhoneVerified: boolean;
  rating?: number;
  reviewCount?: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  phone: string;
  name: string;
  password: string;
  email?: string;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
  verificationRequired?: boolean;
}

// Clés de stockage
const USER_STORAGE_KEY = 'sunuyoon_user';

// Service d'authentification
export const authService = {
  // Inscription
  async register(data: RegisterData): Promise<{ 
    success: boolean; 
    user?: AuthUser; 
    requiresVerification?: boolean; 
    error?: string 
  }> {
    const response = await ApiClient.post<AuthResponse>('/auth/register', data);
    
    if (response.success && response.data) {
      if (response.data.tokens) {
        TokenManager.setTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }
      if (response.data.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
      }
      return { 
        success: true, 
        user: response.data.user,
        requiresVerification: response.data.verificationRequired 
      };
    }
    
    return { 
      success: false, 
      error: response.error?.message || 'Erreur lors de l\'inscription' 
    };
  },

  // Connexion
  async login(data: LoginCredentials): Promise<{ 
    success: boolean; 
    user?: AuthUser; 
    requiresVerification?: boolean; 
    error?: string 
  }> {
    const response = await ApiClient.post<AuthResponse>('/auth/login', data);
    
    if (response.success && response.data) {
      if (response.data.tokens) {
        TokenManager.setTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }
      if (response.data.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
      }
      return { 
        success: true, 
        user: response.data.user,
        requiresVerification: response.data.verificationRequired
      };
    }
    
    return { 
      success: false, 
      error: response.error?.message || 'Identifiants incorrects' 
    };
  },

  // Vérification du code SMS
  async verifyCode(phone: string, code: string): Promise<{ 
    success: boolean; 
    user?: AuthUser; 
    error?: string 
  }> {
    const response = await ApiClient.post<AuthResponse>('/auth/verify', { phone, code });
    
    if (response.success && response.data) {
      if (response.data.tokens) {
        TokenManager.setTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }
      if (response.data.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
      }
      return { success: true, user: response.data.user };
    }
    
    return { 
      success: false, 
      error: response.error?.message || 'Code invalide' 
    };
  },

  // Renvoyer le code de vérification
  async resendCode(phone: string): Promise<{ success: boolean; error?: string }> {
    const response = await ApiClient.post('/auth/resend-code', { phone });
    return { 
      success: response.success, 
      error: response.error?.message 
    };
  },

  // Déconnexion
  async logout(): Promise<void> {
    try {
      await ApiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  },

  // Nettoyer l'authentification
  clearAuth(): void {
    TokenManager.clearTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  // Vérifier si connecté
  isAuthenticated(): boolean {
    return TokenManager.isAuthenticated();
  },

  // Récupérer l'utilisateur actuel depuis le storage
  getCurrentUser(): AuthUser | null {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Récupérer le profil depuis le serveur
  async getProfile(): Promise<AuthUser> {
    const response = await ApiClient.get<{ user: AuthUser }>('/users/me');
    if (response.success && response.data?.user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
      return response.data.user;
    }
    throw new Error('Failed to fetch profile');
  },

  // Rafraîchir le token
  async refreshToken(): Promise<boolean> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await ApiClient.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh-token',
        { refreshToken }
      );
      
      if (response.success && response.data) {
        TokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Refresh token error:', error);
    }
    
    return false;
  }
};
