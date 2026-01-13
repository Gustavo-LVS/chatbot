import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuth = authService.isAuthenticated();
  console.log('AuthGuard executado - Autenticado:', isAuth);
  console.log('Tentando acessar:', state.url);

  if (isAuth) {
    console.log('Acesso permitido');
    return true;
  }

  // Redireciona para login se não estiver autenticado
  console.log('Acesso negado - Redirecionando para login');
  router.navigate(['/'], { queryParams: { returnUrl: state.url } });
  return false;
};
