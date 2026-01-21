import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para páginas de login/cadastro
 * 
 * Impede que usuários já autenticados acessem as páginas de login/cadastro,
 * redirecionando-os para o chat.
 * 
 * Este guard usa a mesma validação robusta de token do authGuard.
 */
export const loginGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Usa a validação completa do token
  const isAuthenticated = authService.isAuthenticated();
  
  if (isAuthenticated) {
    // Verifica se a sessão ainda é válida (não expirada)
    const timeRemaining = authService.getSessionTimeRemaining();
    
    if (timeRemaining > 0) {
      // Usuário já autenticado com sessão válida - redireciona para chat
      console.info('[LoginGuard] Usuário já autenticado - redirecionando para /chat');
      return router.createUrlTree(['/chat']);
    }
  }

  // Sessão inválida ou não existe - permite acesso ao login/cadastro
  console.info('[LoginGuard] Acesso permitido à página de autenticação');
  return true;
};
