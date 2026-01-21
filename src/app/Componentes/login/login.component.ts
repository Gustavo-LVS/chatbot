import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit, OnDestroy {
  username = '';
  password = '';

  /** Mantém sessão após recarregar (localStorage) ou apenas na aba (sessionStorage) */
  rememberSession = true;

  /** Delega ao gerenciador de senhas do navegador (nunca persiste em storage) */
  rememberPassword = false;

  showPassword = false;
  isSubmitting = false;
  
  /** URL para redirecionar após login bem-sucedido */
  private returnUrl = '/chat';
  
  /** Motivo do redirecionamento para esta página */
  sessionMessage = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Captura parâmetros de URL
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        // URL de retorno após login
        if (params['returnUrl']) {
          this.returnUrl = params['returnUrl'];
        }
        
        // Mensagem de sessão expirada ou requerida
        if (params['reason']) {
          switch (params['reason']) {
            case 'session_expired':
              this.sessionMessage = 'Sua sessão expirou. Por favor, faça login novamente.';
              this.toastService.warn('Sessão Expirada', 'Por favor, faça login novamente.');
              break;
            case 'session_required':
              this.sessionMessage = 'Você precisa fazer login para acessar esta página.';
              break;
            default:
              this.sessionMessage = '';
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login(form: NgForm): void {
    if (this.isSubmitting) return;

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.sessionMessage = ''; // Limpa mensagem de sessão

    const username = this.username.trim();

    this.authService
      .login(
        { username, password: this.password },
        { rememberSession: this.rememberSession }
      )
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (result) => {
          if (!result.success) {
            this.toastService.error('Erro', result.message ?? 'Não foi possível realizar o login.');
            return;
          }

          if (this.rememberPassword) {
            void this.authService.tryStoreBrowserPasswordCredential(username, this.password);
          }

          this.password = '';
          this.toastService.success('Bem-vindo', `Olá, ${result.username ?? username}!`);
          
          // Redireciona para URL de retorno ou chat
          void this.router.navigate([this.returnUrl]);
        },
        error: () => {
          this.toastService.error('Erro', 'Falha ao tentar autenticar. Tente novamente.');
        },
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  clearSessionMessage(): void {
    this.sessionMessage = '';
  }
}
