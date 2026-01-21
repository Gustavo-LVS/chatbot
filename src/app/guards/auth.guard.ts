import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de autenticação robusto
 * 
 * Este guard verifica:
 * 1. Existência do token de sessão
 * 2. Validade da assinatura do token (anti-manipulação)
 * 3. Expiração do token
 * 4. Versão do token (compatibilidade)
 * 
 * Se a validação falhar por qualquer motivo, redireciona para login
 * com informação do motivo e URL de retorno.
 */
export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Validação completa do token (não apenas flag booleana)
  const isAuthenticated = authService.isAuthenticated();
  
  if (isAuthenticated) {
    // Verifica se a sessão está prestes a expirar
    const timeRemaining = authService.getSessionTimeRemaining();
    
    if (timeRemaining > 0) {
      // Loga informação útil em desenvolvimento
      if (timeRemaining < 5 * 60 * 1000) { // Menos de 5 minutos
        console.info('[AuthGuard] Sessão expira em', Math.round(timeRemaining / 1000 / 60), 'minutos');
      }
      
      return true;
    }
  }

  // Sessão inválida ou expirada - redireciona para login
  console.warn('[AuthGuard] Acesso negado - sessão inválida ou expirada');
  console.warn('[AuthGuard] Tentativa de acesso a:', state.url);
  
  // Cria URL de redirecionamento com informações úteis
  const queryParams: { returnUrl: string; reason?: string } = {
    returnUrl: state.url
  };
  
  // Adiciona motivo se a sessão expirou (tinha token mas não é válido)
  if (!isAuthenticated) {
    queryParams.reason = 'session_required';
  }
  
  return router.createUrlTree(['/'], { queryParams });
};

/**
 * Guard funcional alternativo para rotas que precisam de verificação adicional
 * Pode ser usado com canActivateChild para proteger rotas filhas
 */
export const authGuardWithRefresh: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Força verificação completa da sessão (assíncrona)
  const isValid = await authService.forceSessionCheck();
  
  if (isValid) {
    return true;
  }
  
  return router.createUrlTree(['/'], { 
    queryParams: { 
      returnUrl: state.url,
      reason: 'session_expired'
    } 
  });
};
