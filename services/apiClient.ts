// Configuration de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types pour les réponses API
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: { message: string };
}

// Gestionnaire de tokens
class TokenManager {
  private static ACCESS_TOKEN_KEY = 'sunu_yoon_access_token';
  private static REFRESH_TOKEN_KEY = 'sunu_yoon_refresh_token';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// Client HTTP avec gestion automatique des tokens
class ApiClient {
  private static async refreshAccessToken(): Promise<boolean> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        TokenManager.clearTokens();
        return false;
      }

      const data = await response.json();
      if (data.success && data.data.tokens) {
        TokenManager.setTokens(
          data.data.tokens.accessToken,
          data.data.tokens.refreshToken
        );
        return true;
      }
      return false;
    } catch {
      TokenManager.clearTokens();
      return false;
    }
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = TokenManager.getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, { ...options, headers });

      // Si 401, essayer de rafraîchir le token
      if (response.status === 401 && token) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          const newToken = TokenManager.getAccessToken();
          (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, { ...options, headers });
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: { message: 'Erreur de connexion au serveur' }
      };
    }
  }

  static get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static post<T>(endpoint: string, body?: object) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static put<T>(endpoint: string, body?: object) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export { ApiClient, TokenManager, API_BASE_URL };
export type { ApiResponse };
