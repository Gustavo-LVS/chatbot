import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  username: string = '';
  password: string = '';

  /**
   * Sessão:
   * - true: mantém "logado" mesmo após recarregar (mock via localStorage)
   * - false: dura só até fechar a aba (mock via sessionStorage)
   */
  rememberSession: boolean = true;

  /**
   * "Memorizar senha" com boas práticas:
   * - quando marcado, tentamos delegar ao gerenciador de senhas do navegador (se suportado).
   * - nunca persistimos senha em storage.
   */
  rememberPassword: boolean = false;

  showPassword: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) { }

  login(form: NgForm) {
    this.errorMessage = null;

    if (this.isSubmitting) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const username = this.username.trim();
    const password = this.password;

    this.authService
      .login(
        { username, password },
        { rememberSession: this.rememberSession }
      )
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (result) => {
          if (!result.success) {
            this.errorMessage = result.message ?? 'Não foi possível realizar o login.';
            this.toastService.error('Erro', this.errorMessage);
            return;
          }

          if (this.rememberPassword) {
            // Best-effort (não bloqueia login)
            void this.authService.tryStoreBrowserPasswordCredential(username, password);
          }

          // Limpa a senha da memória do componente após uso
          this.password = '';

          this.toastService.success('Bem-vindo', `Olá, ${result.username ?? username}!`);

          void this.router.navigate(['/chat']);
        },
        error: () => {
          this.errorMessage = 'Falha ao tentar autenticar. Tente novamente.';
          this.toastService.error('Erro', this.errorMessage);
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
