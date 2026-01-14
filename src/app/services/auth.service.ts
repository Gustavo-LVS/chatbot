import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_KEY = 'chatbot_authenticated';
  private readonly USER_KEY = 'chatbot_username';
  private readonly USERS_KEY = 'chatbot_users_v1';

  /**
   * Em um backend real, evite guardar JWT no `localStorage` (XSS). Prefira cookie HttpOnly + CSRF,
   * ou um armazenamento seguro compatível com o seu threat model.
   *
   * Enquanto não há API, este serviço usa um modo "mock" simples apenas para destravar o front.
   */
  private readonly USE_MOCK_AUTH = true;

  /**
   * Ajuste quando tiver backend.
   * Ex.: 'https://api.seudominio.com' (NUNCA com barra no fim)
   */
  private readonly API_BASE_URL = '';

  constructor(
    private router: Router,
    private http: HttpClient
  ) { }

  // Verifica se o usuário está autenticado
  isAuthenticated(): boolean {
    return this.getStorageValue(this.AUTH_KEY) === 'true';
  }

  // Obtém o nome do usuário logado
  getUsername(): string | null {
    return this.getStorageValue(this.USER_KEY);
  }

  /**
   * Login preparado para API.
   * - No modo mock: valida campos e marca "autenticado".
   * - No modo API: faça o POST e trate token/cookie conforme seu backend.
   */
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
          .then((ok) => {
            if (!ok) {
              subscriber.next({ success: false, message: 'Usuário ou senha inválidos.' });
              subscriber.complete();
              return;
            }

            this.setAuthenticated(username, rememberSession);
            subscriber.next({ success: true, username });
            subscriber.complete();
          })
          .catch(() => {
            subscriber.next({ success: false, message: 'Falha ao validar credenciais.' });
            subscriber.complete();
          });
      });
    }

    // Exemplo de integração (ajuste endpoint/contrato):
    // return this.http.post<LoginResponse>(`${this.API_BASE_URL}/auth/login`, request).pipe(
    //   tap((resp) => this.setAuthenticated(resp.username, rememberSession))
    // );
    return throwError(() => new Error('API_BASE_URL não configurado.'));
  }

  /**
   * Exemplo de cadastro (pronto para plugar no backend).
   * Ajuste o contrato/endpoint conforme sua API.
   */
  register(request: RegisterRequest): Observable<RegisterResult> {
    const username = (request.username ?? '').trim();
    const password = request.password ?? '';

    if (!username || !password) {
      return of({ success: false, code: 'INVALID', message: 'Usuário e senha são obrigatórios.' });
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

    // return this.http.post<RegisterResult>(`${this.API_BASE_URL}/auth/register`, request);
    return throwError(() => new Error('API_BASE_URL não configurado.'));
  }

  /**
   * "Memorizar senha" com boas práticas:
   * - NUNCA salve senha em `localStorage/sessionStorage`.
   * - Se o usuário escolher lembrar, delegue ao gerenciador de senhas do navegador (quando disponível).
   *
   * Observações:
   * - Só funciona em contexto seguro (HTTPS / localhost).
   * - Nem todo navegador suporta; falhas são silenciosas por design.
   */
  async tryStoreBrowserPasswordCredential(username: string, password: string): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      if (!window.isSecureContext) return;
      if (!('credentials' in navigator)) return;
      if (!('PasswordCredential' in window)) return;

      const PasswordCredentialCtor = (window as unknown as { PasswordCredential: new (data: any) => any })
        .PasswordCredential;

      const cred = new PasswordCredentialCtor({
        id: username,
        name: username,
        password
      });

      await (navigator as unknown as { credentials: { store: (c: any) => Promise<void> } }).credentials.store(cred);
    } catch {
      // Intencional: não quebra login se o navegador não suportar / negar.
    }
  }

  // Realiza o logout
  logout(): void {
    localStorage.removeItem(this.AUTH_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.AUTH_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/']);
  }

  private setAuthenticated(username: string, rememberSession: boolean): void {
    const storage = rememberSession ? localStorage : sessionStorage;
    storage.setItem(this.AUTH_KEY, 'true');
    storage.setItem(this.USER_KEY, username);
  }

  private getStorageValue(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

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

  /**
   * Hash de senha no client (mock) apenas para não salvar texto puro.
   * Em produção, o correto é o backend cuidar do hash e armazenamento.
   */
  /**
   * Hash SHA-256 simples com salt (suficiente para mock local)
   * Para produção real, use PBKDF2/Argon2/bcrypt no backend
   */
  private async hashPassword(password: string): Promise<{ salt: string; hash: string }> {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const salt = Array.from(saltBytes, b => b.toString(16).padStart(2, '0')).join('');
    const hash = await this.sha256(password + salt);
    return { salt, hash };
  }

  private async verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
    const hash = await this.sha256(password + salt);
    return hash === expectedHash;
  }

  private async sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginOptions {
  /**
   * - true (padrão): persiste sessão via localStorage (mock).
   * - false: sessão só dura até fechar a aba (sessionStorage).
   */
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
  /**
   * Código simples para o front diferenciar erros sem parsing de mensagem.
   * Ex.: 'USER_EXISTS'
   */
  code?: 'USER_EXISTS' | 'INVALID';
  message?: string;
}

type StoredUser = {
  username: string;
  createdAt: number;
  salt: string;
  passwordHash: string;
};
