import { supabase, supabaseEnabled } from './supabase';
import { API_BASE_URL } from './apiClient';

const TOKEN_KEY = 'sunu_yoon_access_token';
const REFRESH_TOKEN_KEY = 'sunu_yoon_refresh_token';
const USER_KEY = 'sunu_yoon_user';
const USERS_DB_KEY = 'sunu_yoon_users_db';
const AUTH_PROVIDER_KEY = 'sunu_yoon_auth_provider';

export type AuthProvider = 'backend' | 'supabase' | 'local';

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

interface StoredUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  passwordHash: string;
  avatarUrl: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  createdAt: string;
}

interface BackendUserPayload {
  id: string;
  phone: string;
  email?: string | null;
  name: string;
  avatarUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  isVerified?: boolean | null;
  isPhoneVerified?: boolean | null;
  createdAt?: string | null;
}

interface BackendAuthPayload {
  success: boolean;
  data: {
    user: BackendUserPayload;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
    verificationRequired?: boolean;
  };
}

const BACKEND_ENABLED = !!API_BASE_URL;

function hashPassword(password: string): string {
  const salted = 'sunu_' + password + '_yoon_2025';
  let hash = 5381;
  for (let index = 0; index < salted.length; index++) {
    hash = ((hash << 5) + hash) ^ salted.charCodeAt(index);
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, '0') + '_' + salted.length;
}

function generateId(): string {
  return 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function generateToken(userId: string): string {
  const payload = btoa(JSON.stringify({ userId, iat: Date.now() }));
  return `local.${payload}.${Math.random().toString(36).slice(2)}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('221')) return '+' + digits;
  if (digits.length === 9) return '+221' + digits;
  return '+' + digits;
}

function getUsersDb(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsersDb(db: Record<string, StoredUser>): void {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
}

class AuthService {
  private splitName(name?: string | null): { firstName: string; lastName: string } {
    if (!name?.trim()) {
      return { firstName: 'Utilisateur', lastName: '' };
    }

    const [firstName, ...rest] = name.trim().split(/\s+/);
    return {
      firstName,
      lastName: rest.join(' ')
    };
  }

  private storedToAuth(user: StoredUser): AuthUser {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      avatarUrl: user.avatarUrl,
      rating: user.rating,
      reviewCount: user.reviewCount,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };
  }

  private backendToAuth(user: BackendUserPayload): AuthUser {
    const { firstName, lastName } = this.splitName(user.name);
    return {
      id: user.id,
      firstName,
      lastName,
      phone: user.phone,
      email: user.email || undefined,
      avatarUrl: user.avatarUrl || undefined,
      rating: user.rating ?? 5.0,
      reviewCount: user.reviewCount ?? 0,
      isVerified: user.isVerified ?? false,
      createdAt: user.createdAt || new Date().toISOString()
    };
  }

  private async backendRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || payload?.success === false) {
      const message = payload?.message || payload?.error?.message || payload?.error || 'Erreur serveur';
      throw Object.assign(new Error(message), {
        response: { data: payload || { message } },
        status: response.status
      });
    }

    return payload as T;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setTokens(token: string, refreshToken?: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  getCurrentUser(): AuthUser | null {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  setCurrentUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getAuthProvider(): AuthProvider {
    const provider = localStorage.getItem(AUTH_PROVIDER_KEY) as AuthProvider | null;
    if (provider === 'backend' || provider === 'supabase' || provider === 'local') {
      return provider;
    }

    const token = this.getToken();
    if (token?.startsWith('local.')) {
      return 'local';
    }

    return supabaseEnabled && supabase ? 'supabase' : 'local';
  }

  private setAuthProvider(provider: AuthProvider): void {
    localStorage.setItem(AUTH_PROVIDER_KEY, provider);
  }

  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_PROVIDER_KEY);
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (BACKEND_ENABLED) {
      try {
        return await this.loginBackend(credentials);
      } catch (error: any) {
        if (error?.status && error.status < 500 && error.status !== 404) {
          throw error;
        }
      }
    }

    if (supabaseEnabled && supabase) {
      return this.loginSupabase(credentials);
    }

    return this.loginLocal(credentials);
  }

  private async loginBackend(credentials: LoginCredentials): Promise<AuthResponse> {
    const payload = await this.backendRequest<BackendAuthPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    const authUser = this.backendToAuth(payload.data.user);
    this.setAuthProvider('backend');
    this.setTokens(payload.data.tokens.accessToken, payload.data.tokens.refreshToken);
    this.setCurrentUser(authUser);

    return {
      user: authUser,
      token: payload.data.tokens.accessToken,
      refreshToken: payload.data.tokens.refreshToken,
      requiresVerification: payload.data.user.isPhoneVerified === false
    };
  }

  private async loginSupabase(credentials: LoginCredentials): Promise<AuthResponse> {
    const email = this.phoneToEmail(normalizePhone(credentials.phone));
    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password: credentials.password,
    });

    if (error) {
      throw Object.assign(new Error('Numéro ou mot de passe incorrect.'), {
        response: { data: { message: error.message } },
      });
    }

    const { data: profileData } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', data.user!.id)
      .single();

    const authUser: AuthUser = {
      id: data.user!.id,
      firstName: (profileData?.name || '').split(' ')[0] || '',
      lastName: (profileData?.name || '').split(' ').slice(1).join(' ') || '',
      phone: profileData?.phone || credentials.phone,
      email: data.user!.email,
      avatarUrl: profileData?.avatar_url || undefined,
      rating: profileData?.rating ?? 5.0,
      reviewCount: profileData?.review_count ?? 0,
      isVerified: profileData?.is_verified ?? true,
      createdAt: profileData?.created_at || new Date().toISOString(),
    };

    this.setAuthProvider('supabase');
    this.setTokens(data.session!.access_token, data.session!.refresh_token);
    this.setCurrentUser(authUser);
    return { user: authUser, token: data.session!.access_token, requiresVerification: false };
  }

  private async loginLocal(credentials: LoginCredentials): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const phone = normalizePhone(credentials.phone);
    const db = getUsersDb();
    const stored = db[phone];

    if (!stored) {
      throw Object.assign(new Error('Numéro non reconnu. Veuillez vous inscrire.'), {
        response: { data: { message: 'Numéro non reconnu. Veuillez vous inscrire.' } },
      });
    }

    if (stored.passwordHash !== hashPassword(credentials.password)) {
      throw Object.assign(new Error('Mot de passe incorrect.'), {
        response: { data: { message: 'Mot de passe incorrect.' } },
      });
    }

    const token = generateToken(stored.id);
    const authUser = this.storedToAuth(stored);
    this.setAuthProvider('local');
    this.setTokens(token, token + '_r');
    this.setCurrentUser(authUser);
    return { user: authUser, token, refreshToken: token + '_r', requiresVerification: false };
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    if (BACKEND_ENABLED) {
      try {
        return await this.registerBackend(data);
      } catch (error: any) {
        if (error?.status && error.status < 500 && error.status !== 404) {
          throw error;
        }
      }
    }

    if (supabaseEnabled && supabase) {
      return this.registerSupabase(data);
    }

    return this.registerLocal(data);
  }

  private async registerBackend(data: RegisterData): Promise<AuthResponse> {
    const payload = await this.backendRequest<BackendAuthPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const authUser = this.backendToAuth(payload.data.user);
    this.setAuthProvider('backend');
    this.setTokens(payload.data.tokens.accessToken, payload.data.tokens.refreshToken);
    this.setCurrentUser(authUser);

    return {
      user: authUser,
      token: payload.data.tokens.accessToken,
      refreshToken: payload.data.tokens.refreshToken,
      requiresVerification: payload.data.verificationRequired ?? payload.data.user.isPhoneVerified === false
    };
  }

  private async registerSupabase(data: RegisterData): Promise<AuthResponse> {
    const phone = normalizePhone(data.phone);
    const email = this.phoneToEmail(phone);
    const parts = data.name.trim().split(' ');
    const firstName = parts[0] || data.name;
    const lastName = parts.slice(1).join(' ') || '';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + '+' + lastName)}&background=10b981&color=fff`;

    const { data: signUpData, error } = await supabase!.auth.signUp({
      email,
      password: data.password,
      options: {
        data: { name: data.name, phone, avatar_url: avatarUrl },
      },
    });

    if (error) {
      const message = error.message.includes('already registered')
        ? 'Ce numéro est déjà enregistré. Connectez-vous.'
        : error.message;
      throw Object.assign(new Error(message), { response: { data: { message } } });
    }

    const session = signUpData.session;
    if (!session) {
      throw Object.assign(
        new Error('Confirmation email requise. Désactive la vérification email dans Supabase Dashboard → Auth → Providers → Email.'),
        { response: { data: { message: 'Confirmation email requise dans Supabase.' } } }
      );
    }

    const authUser: AuthUser = {
      id: signUpData.user!.id,
      firstName,
      lastName,
      phone,
      email: data.email,
      avatarUrl,
      rating: 5.0,
      reviewCount: 0,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    this.setAuthProvider('supabase');
    this.setTokens(session.access_token, session.refresh_token);
    this.setCurrentUser(authUser);
    return { user: authUser, token: session.access_token, requiresVerification: false };
  }

  private async registerLocal(data: RegisterData): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const phone = normalizePhone(data.phone);
    const db = getUsersDb();

    if (db[phone]) {
      throw Object.assign(new Error('Ce numéro est déjà enregistré. Connectez-vous.'), {
        response: { data: { message: 'Ce numéro est déjà enregistré.' } },
      });
    }

    const parts = data.name.trim().split(' ');
    const firstName = parts[0] || data.name;
    const lastName = parts.slice(1).join(' ') || '';
    const id = generateId();
    const newUser: StoredUser = {
      id,
      name: data.name,
      firstName,
      lastName,
      phone,
      email: data.email,
      passwordHash: hashPassword(data.password),
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + '+' + lastName)}&background=10b981&color=fff`,
      rating: 5.0,
      reviewCount: 0,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    db[phone] = newUser;
    saveUsersDb(db);

    const token = generateToken(id);
    const authUser = this.storedToAuth(newUser);
    this.setAuthProvider('local');
    this.setTokens(token, token + '_r');
    this.setCurrentUser(authUser);
    return { user: authUser, token, refreshToken: token + '_r', requiresVerification: false };
  }

  private phoneToEmail(normalizedPhone: string): string {
    return normalizedPhone.replace('+', '') + '@sunuyoon.sn';
  }

  async verifyCode(_phone: string, code: string): Promise<AuthResponse> {
    if (this.getAuthProvider() === 'backend') {
      const token = this.getToken();
      if (!token) {
        throw new Error('Utilisateur non trouvé');
      }

      await this.backendRequest('/auth/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, type: 'PHONE_VERIFICATION' })
      });

      const user = await this.getProfile();
      return { user, requiresVerification: false };
    }

    const user = this.getCurrentUser();
    if (!user) throw new Error('Utilisateur non trouvé');
    return { user, requiresVerification: false };
  }

  async resendCode(_phone: string): Promise<{ success: boolean }> {
    if (this.getAuthProvider() === 'backend') {
      const token = this.getToken();
      if (!token) {
        throw new Error('Token manquant');
      }

      await this.backendRequest('/auth/resend-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'PHONE_VERIFICATION' })
      });
    }

    return { success: true };
  }

  async refreshToken(): Promise<boolean> {
    if (this.getAuthProvider() === 'backend') {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        this.clearAuth();
        return false;
      }

      try {
        const payload = await this.backendRequest<{
          success: boolean;
          data: { tokens: { accessToken: string; refreshToken: string } };
        }>('/auth/refresh-token', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });

        this.setAuthProvider('backend');
        this.setTokens(payload.data.tokens.accessToken, payload.data.tokens.refreshToken);
        return true;
      } catch {
        this.clearAuth();
        return false;
      }
    }

    if (supabaseEnabled && supabase) {
      const { data } = await supabase.auth.refreshSession();
      return !!data.session;
    }

    return !!this.getToken();
  }

  async getProfile(): Promise<AuthUser> {
    if (this.getAuthProvider() === 'backend') {
      const token = this.getToken();
      if (!token) {
        throw new Error('Non authentifié');
      }

      const payload = await this.backendRequest<{
        success: boolean;
        data: { user: BackendUserPayload };
      }>('/users/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      const authUser = this.backendToAuth(payload.data.user);
      this.setAuthProvider('backend');
      this.setCurrentUser(authUser);
      return authUser;
    }

    const user = this.getCurrentUser();
    if (!user) throw new Error('Non authentifié');
    return user;
  }

  async logout(): Promise<void> {
    if (this.getAuthProvider() === 'backend') {
      const token = this.getToken();
      if (token) {
        try {
          await this.backendRequest('/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch {
          // Ignorer les erreurs distantes de logout
        }
      }
    }

    if (supabaseEnabled && supabase) {
      await supabase.auth.signOut();
    }

    this.clearAuth();
  }
}

export const authService = new AuthService();
export default authService;