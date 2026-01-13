import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuth = authService.isAuthenticated();
  console.log('LoginGuard executado - Autenticado:', isAuth);

  if (isAuth) {
    // Se já estiver autenticado, redireciona para o chat
    console.log('Usuário já autenticado - Redirecionando para /chat');
    router.navigate(['/chat']);
    return false;
  }

  console.log('Usuário não autenticado - Permitindo acesso ao login');
  return true;
};
