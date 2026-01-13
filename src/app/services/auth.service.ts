import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_KEY = 'chatbot_authenticated';
  private readonly USER_KEY = 'chatbot_username';

  constructor(private router: Router) { }

  // Verifica se o usuário está autenticado
  isAuthenticated(): boolean {
    const authValue = localStorage.getItem(this.AUTH_KEY);
    const isAuth = authValue === 'true';
    console.log('Verificando autenticação - localStorage:', authValue, '- Resultado:', isAuth);
    return isAuth;
  }

  // Obtém o nome do usuário logado
  getUsername(): string | null {
    return localStorage.getItem(this.USER_KEY);
  }

  // Realiza o login
  login(username: string): boolean {
    if (username && username.trim()) {
      localStorage.setItem(this.AUTH_KEY, 'true');
      localStorage.setItem(this.USER_KEY, username.trim());
      return true;
    }
    return false;
  }

  // Realiza o logout
  logout(): void {
    localStorage.removeItem(this.AUTH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/']);
  }
}
