import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  username = '';
  password = '';

  /** Mantém sessão após recarregar (localStorage) ou apenas na aba (sessionStorage) */
  rememberSession = true;

  /** Delega ao gerenciador de senhas do navegador (nunca persiste em storage) */
  rememberPassword = false;

  showPassword = false;
  isSubmitting = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  login(form: NgForm): void {
    if (this.isSubmitting) return;

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

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
          void this.router.navigate(['/chat']);
        },
        error: () => {
          this.toastService.error('Erro', 'Falha ao tentar autenticar. Tente novamente.');
        },
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
