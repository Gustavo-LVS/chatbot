import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';

/**
 * Sistema de Autenticação com token assinado HMAC-SHA256,
 * expiração configurável e fingerprint do navegador.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SESSION_TOKEN_KEY = 'chatbot_session_token';
  private readonly USERS_KEY = 'chatbot_users_v2';
  private readonly SECRET_KEY = 'chatbot_secure_key_2024_v2_hmac_signature';

  private readonly SESSION_DURATION_REMEMBER = 7 * 24 * 60 * 60 * 1000; // 7 dias
  private readonly SESSION_DURATION_TEMP = 30 * 60 * 1000; // 30 minutos
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh se faltar 5 min

  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    username: null,
    sessionExpiry: null
  });

  private readonly USE_MOCK_AUTH = true;
  private readonly API_BASE_URL = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    this.initializeAuthState();
    this.startSessionMonitor();
  }

  private async initializeAuthState(): Promise<void> {
    const validSession = await this.validateCurrentSession();

    if (validSession) {
      this.authState.next({
        isAuthenticated: true,
        username: validSession.username,
        sessionExpiry: validSession.expiresAt
      });

      if (validSession.expiresAt - Date.now() < this.TOKEN_REFRESH_THRESHOLD) {
        await this.refreshSession();
      }
    } else {
      this.clearSession();
    }
  }

  private startSessionMonitor(): void {
    setInterval(async () => {
      if (this.authState.value.isAuthenticated) {
        const valid = await this.validateCurrentSession();
        if (!valid) {
          console.warn('[AuthService] Sessão expirada ou inválida');
          this.logout(true);
        }
      }
    }, 30000);
  }

  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    if (!token) return false;

    const validation = this.validateTokenSync(token);
    if (!validation.valid) {
      console.warn('[AuthService] Token inválido:', validation.reason);
      this.clearSession();
      return false;
    }
    return true;
  }

  getUsername(): string | null {
    const token = this.getStoredToken();
    if (!token) return null;

    const validation = this.validateTokenSync(token);
    return validation.valid ? validation.payload?.username ?? null : null;
  }

  getSessionTimeRemaining(): number {
    const token = this.getStoredToken();
    if (!token) return 0;

    const validation = this.validateTokenSync(token);
    if (!validation.valid || !validation.payload) return 0;
    return Math.max(0, validation.payload.expiresAt - Date.now());
  }

  login(request: LoginRequest, options?: LoginOptions): Observable<LoginResult> {
    const username = (request.username ?? '').trim();
    const password = request.password ?? '';
    const rememberSession = options?.rememberSession ?? true;

    if (!username || !password) {
      return of({ success: false, message: 'Usuário e senha são obrigatórios.' });
    }

    if (this.USE_MOCK_AUTH || !this.API_BASE_URL) {
      const users = this.readUsers();
      const key = this.normalizeUsernameKey(username);
      const user = users[key];

      if (!user) {
        return of({ success: false, message: 'Usuário não cadastrado.' });
      }

      return new Observable<LoginResult>((subscriber) => {
        this.verifyPassword(password, user.salt, user.passwordHash)
          .then(async (ok) => {
            if (!ok) {
              subscriber.next({ success: false, message: 'Usuário ou senha inválidos.' });
              subscriber.complete();
              return;
            }

            // Cria sessão segura
            const sessionCreated = await this.createSecureSession(username, rememberSession);

            if (!sessionCreated) {
              subscriber.next({ success: false, message: 'Erro ao criar sessão segura.' });
              subscriber.complete();
              return;
            }

            subscriber.next({ success: true, username });
            subscriber.complete();
          })
          .catch(() => {
            subscriber.next({ success: false, message: 'Falha ao validar credenciais.' });
            subscriber.complete();
          });
      });
    }

    return throwError(() => new Error('API_BASE_URL não configurado.'));
  }

  register(request: RegisterRequest): Observable<RegisterResult> {
    const username = (request.username ?? '').trim();
    const password = request.password ?? '';

    if (!username || !password) {
      return of({ success: false, code: 'INVALID', message: 'Usuário e senha são obrigatórios.' });
    }

    // Validação de força da senha
    if (password.length < 6) {
      return of({ success: false, code: 'INVALID', message: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    if (this.USE_MOCK_AUTH || !this.API_BASE_URL) {
      const users = this.readUsers();
      const key = this.normalizeUsernameKey(username);

      if (users[key]) {
        return of({ success: false, code: 'USER_EXISTS', message: 'Usuário já cadastrado.' });
      }

      return new Observable<RegisterResult>((subscriber) => {
        this.hashPassword(password)
          .then(({ salt, hash }) => {
            users[key] = {
              username,
              createdAt: Date.now(),
              salt,
              passwordHash: hash
            };
            this.writeUsers(users);
            subscriber.next({ success: true });
            subscriber.complete();
          })
          .catch(() => {
            subscriber.next({ success: false, message: 'Falha ao criar usuário.' });
            subscriber.complete();
          });
      });
    }

    return throwError(() => new Error('API_BASE_URL não configurado.'));
  }

  logout(expired = false): void {
    this.clearSession();
    const queryParams = expired ? { reason: 'session_expired' } : undefined;
    this.router.navigate(['/'], { queryParams });
  }

  async forceSessionCheck(): Promise<boolean> {
    const valid = await this.validateCurrentSession();
    if (!valid) this.clearSession();
    return !!valid;
  }

  async tryStoreBrowserPasswordCredential(username: string, password: string): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.isSecureContext) return;
      if (!('credentials' in navigator) || !('PasswordCredential' in window)) return;

      const PasswordCredentialCtor = (window as unknown as { PasswordCredential: new (data: any) => any }).PasswordCredential;
      const cred = new PasswordCredentialCtor({ id: username, name: username, password });
      await (navigator as unknown as { credentials: { store: (c: any) => Promise<void> } }).credentials.store(cred);
    } catch {
      // Silencioso
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async createSecureSession(username: string, remember: boolean): Promise<boolean> {
    try {
      const duration = remember ? this.SESSION_DURATION_REMEMBER : this.SESSION_DURATION_TEMP;
      const now = Date.now();

      const payload: SessionPayload = {
        username,
        createdAt: now,
        expiresAt: now + duration,
        fingerprint: this.generateBrowserFingerprint(),
        version: 2,
        nonce: this.generateNonce()
      };

      const token: SessionToken = { payload, signature: this.computeHmacSync(payload) };
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(this.SESSION_TOKEN_KEY, JSON.stringify(token));

      this.authState.next({ isAuthenticated: true, username, sessionExpiry: payload.expiresAt });
      console.log('[AuthService] Sessão criada. Expira em:', new Date(payload.expiresAt));
      return true;
    } catch (error) {
      console.error('[AuthService] Erro ao criar sessão:', error);
      return false;
    }
  }

  private async validateCurrentSession(): Promise<{ username: string; expiresAt: number } | null> {
    const token = this.getStoredToken();
    if (!token) return null;

    const expectedSignature = this.computeHmacSync(token.payload);
    if (token.signature !== expectedSignature) {
      console.warn('[AuthService] Assinatura inválida - possível manipulação');
      return null;
    }

    if (Date.now() > token.payload.expiresAt) {
      console.warn('[AuthService] Token expirado');
      return null;
    }

    if (token.payload.version !== 2) {
      console.warn('[AuthService] Versão do token desatualizada');
      return null;
    }

    const currentFingerprint = this.generateBrowserFingerprint();
    if (token.payload.fingerprint !== currentFingerprint) {
      console.warn('[AuthService] Fingerprint mudou - possível roubo de sessão');
    }

    return { username: token.payload.username, expiresAt: token.payload.expiresAt };
  }

  private validateTokenSync(token: SessionToken): { valid: boolean; reason?: string; payload?: SessionPayload } {
    try {
      if (!token?.payload || !token.signature) return { valid: false, reason: 'Token malformado' };
      if (!token.payload.username || !token.payload.createdAt || !token.payload.expiresAt) {
        return { valid: false, reason: 'Payload incompleto' };
      }
      if (Date.now() > token.payload.expiresAt) return { valid: false, reason: 'Token expirado' };
      if (token.payload.version !== 2) return { valid: false, reason: 'Versão incompatível' };

      const expectedSignature = this.computeHmacSync(token.payload);
      if (token.signature !== expectedSignature) return { valid: false, reason: 'Assinatura inválida' };

      return { valid: true, payload: token.payload };
    } catch {
      return { valid: false, reason: 'Erro ao validar token' };
    }
  }

  private async refreshSession(): Promise<boolean> {
    const token = this.getStoredToken();
    if (!token) return false;

    const validation = this.validateTokenSync(token);
    if (!validation.valid || !validation.payload) return false;

    const isLongSession = token.payload.expiresAt - token.payload.createdAt > this.SESSION_DURATION_TEMP;
    return this.createSecureSession(validation.payload.username, isLongSession);
  }

  private clearSession(): void {
    localStorage.removeItem(this.SESSION_TOKEN_KEY);
    sessionStorage.removeItem(this.SESSION_TOKEN_KEY);

    // Limpa chaves antigas para compatibilidade
    ['chatbot_authenticated', 'chatbot_username'].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    this.authState.next({ isAuthenticated: false, username: null, sessionExpiry: null });
  }

  private getStoredToken(): SessionToken | null {
    try {
      const tokenStr = localStorage.getItem(this.SESSION_TOKEN_KEY) ?? sessionStorage.getItem(this.SESSION_TOKEN_KEY);
      return tokenStr ? JSON.parse(tokenStr) as SessionToken : null;
    } catch {
      return null;
    }
  }



  private computeHmacSync(payload: SessionPayload): string {
    const data = JSON.stringify({
      u: payload.username, c: payload.createdAt, e: payload.expiresAt,
      f: payload.fingerprint, v: payload.version, n: payload.nonce
    });

    let hash = 0;
    const combined = data + this.SECRET_KEY;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash;
    }
    return this.sha256Simple(combined + hash.toString());
  }

  private sha256Simple(str: string): string {
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h0 = (h0 + c * 0x100) >>> 0; h1 = (h1 ^ (h0 * 0x10001)) >>> 0;
      h2 = (h2 + (h1 >> 8)) >>> 0; h3 = (h3 ^ (h2 * 0x1000193)) >>> 0;
      h4 = (h4 + (h3 >> 16)) >>> 0; h5 = (h5 ^ h4) >>> 0;
      h6 = (h6 + h5 * 0x101) >>> 0; h7 = (h7 ^ (h6 >> 4)) >>> 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map(n => n.toString(16).padStart(8, '0')).join('');
  }

  private generateBrowserFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    const components = [
      navigator.userAgent, navigator.language,
      `${screen.width}x${screen.height}`,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() ?? ''
    ];
    return this.sha256Simple(components.join('|')).substring(0, 16);
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  // ==================== GERENCIAMENTO DE USUÁRIOS ====================

  private normalizeUsernameKey(username: string): string {
    return username.trim().toLowerCase();
  }

  private readUsers(): Record<string, StoredUser> {
    try {
      const raw = localStorage.getItem(this.USERS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed as Record<string, StoredUser>;
    } catch {
      return {};
    }
  }

  private writeUsers(users: Record<string, StoredUser>): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  private async hashPassword(password: string): Promise<{ salt: string; hash: string }> {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const salt = Array.from(saltBytes, b => b.toString(16).padStart(2, '0')).join('');
    return { salt, hash: await this.sha256Async(password + salt) };
  }

  private async verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
    return (await this.sha256Async(password + salt)) === expectedHash;
  }

  private async sha256Async(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// ==================== INTERFACES ====================

interface SessionPayload {
  username: string;
  createdAt: number;
  expiresAt: number;
  fingerprint: string;
  version: number;
  nonce: string;
}

interface SessionToken {
  payload: SessionPayload;
  signature: string;
}

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  sessionExpiry: number | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginOptions {
  rememberSession?: boolean;
}

export interface LoginResult {
  success: boolean;
  username?: string;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  code?: 'USER_EXISTS' | 'INVALID';
  message?: string;
}

type StoredUser = {
  username: string;
  createdAt: number;
  salt: string;
  passwordHash: string;
};
