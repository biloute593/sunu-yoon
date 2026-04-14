const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// Clés unifiées avec apiClient.ts pour éviter les incohérences
const TOKEN_KEY = 'sunu_yoon_access_token';
const REFRESH_TOKEN_KEY = 'sunu_yoon_refresh_token';
const USER_KEY = 'sunu_yoon_user';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  isVerified: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegisterData {
  name: string;
  phone: string;
  email?: string;
  password: string;
}

export interface AuthResponse {
  user?: AuthUser;
  token?: string;
  refreshToken?: string;
  requiresVerification?: boolean;
  message?: string;
}

class AuthService {
  // Récupérer le token d'accès
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Sauvegarder les tokens
  setTokens(token: string, refreshToken?: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  // Récupérer l'utilisateur stocké
  getCurrentUser(): AuthUser | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Sauvegarder l'utilisateur
  setCurrentUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Effacer les données d'authentification
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Headers avec authentification
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Connexion
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const error = await response.json();
        throw { response: { data: error } };
      }

      const data = await response.json();

      // Supporter les deux formats: {token} et {tokens: {accessToken}}
      const accessToken = data?.data?.tokens?.accessToken || data?.data?.token || data?.token;
      const refreshToken = data?.data?.tokens?.refreshToken || data?.data?.refreshToken || data?.refreshToken;
      const user = data?.data?.user || data?.user;

      if (accessToken && user) {
        this.setTokens(accessToken, refreshToken);
        // Transformer le user pour compléter firstName/lastName si manquant
        const authUser: AuthUser = {
          id: user.id,
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          phone: user.phone,
          email: user.email,
          avatarUrl: user.avatarUrl,
          rating: user.rating,
          reviewCount: user.reviewCount,
          isVerified: user.isVerified,
          createdAt: user.createdAt || new Date().toISOString()
        };
        this.setCurrentUser(authUser);
      }

      return {
        user: data?.data?.user || data?.user,
        token: accessToken,
        refreshToken,
        requiresVerification: data?.data?.verificationRequired || data?.requiresVerification || false,
        message: data?.message
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Inscription
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Séparer le nom en prénom et nom
      const nameParts = data.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || undefined;

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: data.phone,
          email: data.email,
          password: data.password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw { response: { data: error } };
      }

      const result: AuthResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // Vérifier le code SMS
  async verifyCode(phone: string, code: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });

      if (!response.ok) {
        const error = await response.json();
        throw { response: { data: error } };
      }

      const data = await response.json();

      const accessToken = data?.data?.tokens?.accessToken || data?.data?.token || data?.token;
      const refreshToken = data?.data?.tokens?.refreshToken || data?.data?.refreshToken || data?.refreshToken;
      const user = data?.data?.user || data?.user;

      if (accessToken && user) {
        this.setTokens(accessToken, refreshToken);
        const authUser: AuthUser = {
          id: user.id,
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          phone: user.phone,
          email: user.email,
          avatarUrl: user.avatarUrl,
          rating: user.rating,
          reviewCount: user.reviewCount,
          isVerified: user.isVerified,
          createdAt: user.createdAt || new Date().toISOString()
        };
        this.setCurrentUser(authUser);
      }

      return {
        user: user,
        token: accessToken,
        refreshToken,
        requiresVerification: data?.data?.verificationRequired || false,
        message: data?.message
      };
    } catch (error) {
      console.error('Verify error:', error);
      throw error;
    }
  }

  // Renvoyer le code SMS
  async resendCode(phone: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_URL}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      if (!response.ok) {
        const error = await response.json();
        throw { response: { data: error } };
      }

      return { success: true };
    } catch (error) {
      console.error('Resend code error:', error);
      throw error;
    }
  }

  // Rafraîchir le token
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.token) {
        this.setTokens(data.token, data.refreshToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Refresh token error:', error);
      return false;
    }
  }

  // Récupérer le profil utilisateur
  async getProfile(): Promise<AuthUser> {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get profile');
    }

    const user: AuthUser = await response.json();
    this.setCurrentUser(user);
    return user;
  }

  // Déconnexion
  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

}

export const authService = new AuthService();
export default authService;
